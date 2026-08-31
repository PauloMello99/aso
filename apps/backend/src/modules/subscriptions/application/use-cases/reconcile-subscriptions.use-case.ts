import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY,
} from "../../domain/subscription.repository.interface";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import {
  BILLING_PLAN_PRICE_REPOSITORY,
  IBillingPlanPriceRepository,
} from "../../domain/billing-plan-price.repository.interface";
import type { SubscriptionEntity } from "../../domain/subscription.entity";
import {
  shouldApplyStripeSync,
  shouldMarkTrialConsumed,
  shouldSkipStripeStatusOverride,
} from "../../domain/subscription-sync";
import { TelemetryService } from "../../../../common/telemetry/telemetry.service";

export interface ReconcileSubscriptionDiff {
  orgId: string;
  field: string;
  oldValue: string;
  newValue: string;
}

export interface ReconcileSubscriptionsResult {
  checked: number;
  updated: number;
  errors: number;
  diffs: ReconcileSubscriptionDiff[];
}

type DiffValue = string | number | boolean | Date | null;

function serializeDiffValue(value: DiffValue): string {
  if (value === null) return "null";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Periodic safety net for missed/delayed Stripe webhooks: re-fetches every
 * Stripe-linked subscription from Stripe and reconciles drift against the
 * local state, mirroring the sync logic in HandleStripeWebhookUseCase.
 */
@Injectable()
export class ReconcileSubscriptionsUseCase {
  private readonly logger = new Logger(ReconcileSubscriptionsUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(BILLING_PLAN_PRICE_REPOSITORY)
    private readonly billingPlanPriceRepo: IBillingPlanPriceRepository,
    private readonly telemetry: TelemetryService,
  ) {}

  async execute(): Promise<ReconcileSubscriptionsResult> {
    const subscriptions = await this.subscriptionRepo.findAllStripeLinked();

    let updated = 0;
    let errors = 0;
    const diffs: ReconcileSubscriptionDiff[] = [];

    for (const subscription of subscriptions) {
      try {
        const didUpdate = await this.reconcileOne(subscription, diffs);
        if (didUpdate) updated += 1;
      } catch (error) {
        errors += 1;
        this.logger.error(
          `Failed to reconcile subscription for org ${subscription.orgId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const result: ReconcileSubscriptionsResult = {
      checked: subscriptions.length,
      updated,
      errors,
      diffs,
    };
    this.logger.log(
      `Reconciliation complete: checked=${result.checked} updated=${result.updated} errors=${result.errors}`,
    );
    return result;
  }

  private async reconcileOne(
    subscription: SubscriptionEntity,
    diffs: ReconcileSubscriptionDiff[],
  ): Promise<boolean> {
    if (!subscription.stripeSubscriptionId) return false;

    const normalized = await this.paymentGateway.getSubscription(
      subscription.stripeSubscriptionId,
    );

    if (!normalized) {
      // The subscription no longer exists in Stripe (deleted/expired there
      // without the corresponding webhook ever arriving) — treat as canceled.
      if (!shouldApplyStripeSync(subscription, {})) return false;
      if (subscription.status === "canceled") return false;
      await this.subscriptionRepo.update(subscription.orgId, {
        status: "canceled",
        type: "free",
        canceledAt: new Date(),
        // The subscription is gone from Stripe: a leftover cancelAtPeriodEnd=true
        // would be an unfaithful mirror (nothing left to cancel).
        cancelAtPeriodEnd: false,
      });
      return true;
    }

    if (!shouldApplyStripeSync(subscription, {})) return false;

    // Anti-flap guard (shared with HandleStripeWebhookUseCase): don't let a
    // delayed Stripe past_due/canceled resurrect a subscription that
    // ExpireSubscriptionsUseCase locked locally — see shouldSkipStripeStatusOverride.
    if (
      shouldSkipStripeStatusOverride(subscription.status, normalized.status)
    ) {
      return false;
    }

    // Same safety net as HandleStripeWebhookUseCase: a missed/delayed webhook
    // must not leave trialConsumed stuck at false forever.
    const markTrialConsumed = shouldMarkTrialConsumed(subscription, normalized);

    // Orphan detection (the inverse of ReconcilePlanCatalogUseCase, which
    // handles a price that vanished from Stripe): here the price still exists
    // in Stripe but has no row in the local plan catalog. Checked BEFORE the
    // drift gate below so it still surfaces on a tick where no other field
    // diverged (the `getSubscription` above already ran, so this only adds one
    // `findByStripePriceId` per Stripe-linked subscription). Same rationale as
    // `handlePriceDeleted` in the webhook — do NOT touch the subscription over
    // this (it would break checkout/billing for a paying subscriber); just
    // surface it for manual review.
    if (normalized.stripePriceId !== null) {
      const catalogPrice = await this.billingPlanPriceRepo.findByStripePriceId(
        normalized.stripePriceId,
      );
      if (!catalogPrice) {
        this.logger.warn(
          `Stripe subscription ${subscription.stripeSubscriptionId} (org ${subscription.orgId}) is on price ${normalized.stripePriceId}, which has no matching billing_plan_prices row — leaving the subscription untouched, needs manual review`,
        );
        this.telemetry.captureMessage(
          `Reconcile found a subscribed org on a Stripe price absent from the local plan catalog for org ${subscription.orgId}`,
          "warn",
          {
            module: "subscriptions",
            code: "BILLING_SUBSCRIPTION_PRICE_NOT_IN_CATALOG",
            orgId: subscription.orgId,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            stripePriceId: normalized.stripePriceId,
          },
        );
      }
    }

    // ADR-0024: a per-field drift report — every mirrored Stripe field that
    // diverges from the local row is recorded. `diffs` is produced for the
    // Bloco B consumer (a reconcile endpoint/report) and is NOT surfaced
    // anywhere yet: `InternalCronController.tick` discards this return value.
    // The "an automatic overwrite is never silent" guarantee currently holds
    // only for the MONETARY subset, via the `captureMessage` blocks below. The
    // set of fields checked here is exactly the set the `update` payload below
    // writes back from Stripe (minus the always-mirror ids/`type`); adding a
    // field here would change *when* a write happens.
    const localDiffs: ReconcileSubscriptionDiff[] = [];
    const recordDiff = (
      field: string,
      oldValue: DiffValue,
      newValue: DiffValue,
    ): void => {
      localDiffs.push({
        orgId: subscription.orgId,
        field,
        oldValue: serializeDiffValue(oldValue),
        newValue: serializeDiffValue(newValue),
      });
    };

    if (subscription.status !== normalized.status) {
      recordDiff("status", subscription.status, normalized.status);
    }
    if (subscription.billingInterval !== normalized.billingInterval) {
      recordDiff(
        "billingInterval",
        subscription.billingInterval,
        normalized.billingInterval,
      );
    }
    if (subscription.priceCents !== normalized.priceCents) {
      recordDiff("priceCents", subscription.priceCents, normalized.priceCents);
    }
    if (subscription.stripePriceId !== normalized.stripePriceId) {
      recordDiff(
        "stripePriceId",
        subscription.stripePriceId,
        normalized.stripePriceId,
      );
    }
    if (subscription.stripeCouponId !== normalized.stripeCouponId) {
      recordDiff(
        "stripeCouponId",
        subscription.stripeCouponId,
        normalized.stripeCouponId,
      );
    }
    if (subscription.discountPercent !== normalized.discountPercent) {
      recordDiff(
        "discountPercent",
        subscription.discountPercent,
        normalized.discountPercent,
      );
    }
    if (
      subscription.trialEndsAt?.getTime() !== normalized.trialEndsAt?.getTime()
    ) {
      recordDiff(
        "trialEndsAt",
        subscription.trialEndsAt,
        normalized.trialEndsAt,
      );
    }
    if (
      subscription.currentPeriodStart?.getTime() !==
      normalized.currentPeriodStart?.getTime()
    ) {
      recordDiff(
        "currentPeriodStart",
        subscription.currentPeriodStart,
        normalized.currentPeriodStart,
      );
    }
    if (
      subscription.currentPeriodEnd?.getTime() !==
      normalized.currentPeriodEnd?.getTime()
    ) {
      recordDiff(
        "currentPeriodEnd",
        subscription.currentPeriodEnd,
        normalized.currentPeriodEnd,
      );
    }
    if (
      subscription.canceledAt?.getTime() !== normalized.canceledAt?.getTime()
    ) {
      recordDiff("canceledAt", subscription.canceledAt, normalized.canceledAt);
    }
    if (subscription.cancelAtPeriodEnd !== normalized.cancelAtPeriodEnd) {
      recordDiff(
        "cancelAtPeriodEnd",
        subscription.cancelAtPeriodEnd,
        normalized.cancelAtPeriodEnd,
      );
    }

    const hasDrift = localDiffs.length > 0 || markTrialConsumed;

    if (!hasDrift) return false;

    diffs.push(...localDiffs);

    // ADR-0024: an automatic monetary overwrite is never silent. Now that
    // toNormalizedSubscription mirrors the real Stripe coupon/discount (no
    // longer hard-coded null), reconcile can overwrite the local discount —
    // surface it for manual review before writing.
    if (
      subscription.stripeCouponId !== normalized.stripeCouponId ||
      subscription.discountPercent !== normalized.discountPercent
    ) {
      this.logger.warn(
        `Overwriting local discount for org ${subscription.orgId} (subscription ${subscription.stripeSubscriptionId}) with Stripe state: coupon ${subscription.stripeCouponId} -> ${normalized.stripeCouponId}, percent ${subscription.discountPercent} -> ${normalized.discountPercent}`,
      );
      this.telemetry.captureMessage(
        `Reconcile is overwriting local subscription discount to match Stripe for org ${subscription.orgId}`,
        "warn",
        {
          module: "subscriptions",
          code: "BILLING_SUBSCRIPTION_DISCOUNT_DRIFT_OVERWRITTEN",
          orgId: subscription.orgId,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          fromCouponId: subscription.stripeCouponId,
          toCouponId: normalized.stripeCouponId,
          fromDiscountPercent: subscription.discountPercent,
          toDiscountPercent: normalized.discountPercent,
        },
      );
    }

    // ADR-0024: telemetry is reserved for MONETARY drift only. `status` /
    // `currentPeriod*` / `canceledAt` / `cancelAtPeriodEnd` / `trialEndsAt`
    // move on every renewal and would drown the money signal — they are in
    // `diffs` (the full report) but never a `captureMessage`.
    if (
      subscription.priceCents !== normalized.priceCents ||
      subscription.stripePriceId !== normalized.stripePriceId ||
      subscription.billingInterval !== normalized.billingInterval
    ) {
      this.logger.warn(
        `Overwriting local billing price for org ${subscription.orgId} (subscription ${subscription.stripeSubscriptionId}) with Stripe state: priceCents ${subscription.priceCents} -> ${normalized.priceCents}, stripePriceId ${subscription.stripePriceId} -> ${normalized.stripePriceId}, billingInterval ${subscription.billingInterval} -> ${normalized.billingInterval}`,
      );
      this.telemetry.captureMessage(
        `Reconcile is overwriting local subscription billing price to match Stripe for org ${subscription.orgId}`,
        "warn",
        {
          module: "subscriptions",
          code: "BILLING_SUBSCRIPTION_PRICE_DRIFT_OVERWRITTEN",
          orgId: subscription.orgId,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          fromPriceCents: subscription.priceCents,
          toPriceCents: normalized.priceCents,
          fromStripePriceId: subscription.stripePriceId,
          toStripePriceId: normalized.stripePriceId,
          fromBillingInterval: subscription.billingInterval,
          toBillingInterval: normalized.billingInterval,
        },
      );
    }

    await this.subscriptionRepo.update(subscription.orgId, {
      stripeCustomerId: normalized.stripeCustomerId,
      stripeSubscriptionId: normalized.stripeSubscriptionId,
      status: normalized.status,
      type: normalized.status === "trialing" ? "trial" : "standard",
      billingInterval: normalized.billingInterval,
      priceCents: normalized.priceCents,
      stripePriceId: normalized.stripePriceId,
      stripeCouponId: normalized.stripeCouponId,
      discountPercent: normalized.discountPercent,
      trialEndsAt: normalized.trialEndsAt,
      currentPeriodStart: normalized.currentPeriodStart,
      currentPeriodEnd: normalized.currentPeriodEnd,
      canceledAt: normalized.canceledAt,
      cancelAtPeriodEnd: normalized.cancelAtPeriodEnd,
      ...(markTrialConsumed ? { trialConsumed: true } : {}),
    });

    return true;
  }
}
