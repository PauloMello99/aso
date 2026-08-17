import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY,
} from "../../domain/subscription.repository.interface";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import { TelemetryService } from "../../../../common/telemetry/telemetry.service";

export type MigrateSubscriberStatus =
  | "migrated"
  | "skipped_already_migrated"
  | "failed";

export interface MigrateSubscriberResult {
  orgId: string;
  stripeSubscriptionId: string;
  status: MigrateSubscriberStatus;
  error?: string;
}

export interface MigrateSubscribersReport {
  results: MigrateSubscriberResult[];
}

export interface MigrateSubscribersToPriceParams {
  oldPriceId: string;
  newPriceId: string;
}

/**
 * Migrates every subscriber currently on `oldPriceId` (as returned by
 * `findMigratableByStripePriceId` — already filtered to real, non-comp,
 * active/trialing subscriptions) to `newPriceId` on Stripe, then persists
 * the normalized result locally.
 *
 * Runs sequentially (not `Promise.all`): expected volume is low and this
 * avoids hammering Stripe with concurrent requests for what is already a
 * rate-limited, money-moving operation. A failure on one subscription is
 * captured in its own report row and never aborts the remaining ones — the
 * rotation that triggers this migration already happened and is
 * irreversible, so an early abort here would only hide information, not
 * undo anything.
 *
 * Idempotency: `idempotencyKey` is deterministic
 * (`${stripeSubscriptionId}:${newPriceId}`), and subscriptions whose local
 * `stripePriceId` already equals `newPriceId` are skipped before touching
 * the gateway at all. Re-running this use-case with the same
 * (oldPriceId, newPriceId) pair — e.g. a retry after a partial failure —
 * is therefore safe: already-migrated subscriptions are skipped, and
 * not-yet-migrated ones reuse the same idempotency key, protecting against
 * double proration even if a previous HTTP call to Stripe timed out without
 * confirming.
 */
@Injectable()
export class MigrateSubscribersToPriceUseCase {
  private readonly logger = new Logger(MigrateSubscribersToPriceUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly telemetry: TelemetryService,
  ) {}

  async execute(
    params: MigrateSubscribersToPriceParams,
  ): Promise<MigrateSubscribersReport> {
    const { oldPriceId, newPriceId } = params;
    const subscriptions =
      await this.subscriptionRepo.findMigratableByStripePriceId(oldPriceId);

    const results: MigrateSubscriberResult[] = [];

    for (const subscription of subscriptions) {
      const stripeSubscriptionId = subscription.stripeSubscriptionId;
      // findMigratableByStripePriceId is documented to already filter to
      // rows with a non-null stripeSubscriptionId, but the entity type
      // keeps it nullable — narrow defensively rather than asserting. This
      // should be unreachable in practice, so we log and skip instead of
      // fabricating a stripeSubscriptionId/report row for telemetry.
      if (!stripeSubscriptionId) {
        this.logger.error(
          `Skipping subscription org=${subscription.orgId}: findMigratableByStripePriceId returned a row with no stripeSubscriptionId`,
        );
        continue;
      }

      if (subscription.stripePriceId === newPriceId) {
        results.push({
          orgId: subscription.orgId,
          stripeSubscriptionId,
          status: "skipped_already_migrated",
        });
        continue;
      }

      try {
        const updated = await this.paymentGateway.updateSubscriptionPrice(
          stripeSubscriptionId,
          newPriceId,
          {
            prorationBehavior: "create_prorations",
            idempotencyKey: `${stripeSubscriptionId}:${newPriceId}`,
          },
        );

        await this.subscriptionRepo.update(subscription.orgId, {
          status: updated.status,
          billingInterval: updated.billingInterval,
          priceCents: updated.priceCents,
          stripePriceId: updated.stripePriceId,
          stripeCouponId: updated.stripeCouponId,
          discountPercent: updated.discountPercent,
          trialEndsAt: updated.trialEndsAt,
          currentPeriodStart: updated.currentPeriodStart,
          currentPeriodEnd: updated.currentPeriodEnd,
          canceledAt: updated.canceledAt,
        });

        results.push({
          orgId: subscription.orgId,
          stripeSubscriptionId,
          status: "migrated",
        });
      } catch (error) {
        this.logger.error(
          `Failed to migrate subscription ${stripeSubscriptionId} (org ${subscription.orgId}) from price ${oldPriceId} to ${newPriceId}`,
          error instanceof Error ? error.stack : String(error),
        );
        results.push({
          orgId: subscription.orgId,
          stripeSubscriptionId,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const failedOrgIds = results
      .filter((r) => r.status === "failed")
      .map((r) => r.orgId);

    if (failedOrgIds.length > 0) {
      this.telemetry.captureMessage(
        `Partial failure migrating subscribers from price ${oldPriceId} to ${newPriceId}`,
        "error",
        {
          code: "BILLING_SUBSCRIBER_MIGRATION_PARTIAL_FAILURE",
          module: "subscriptions",
          failedOrgIds,
        },
      );
    }

    return { results };
  }
}
