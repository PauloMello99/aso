import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY,
} from "../../domain/subscription.repository.interface";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import type { SubscriptionEntity } from "../../domain/subscription.entity";
import { shouldApplyStripeSync } from "../../domain/subscription-sync";

export interface ReconcileSubscriptionsResult {
  checked: number;
  updated: number;
  errors: number;
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
  ) {}

  async execute(): Promise<ReconcileSubscriptionsResult> {
    const subscriptions = await this.subscriptionRepo.findAllStripeLinked();

    let updated = 0;
    let errors = 0;

    for (const subscription of subscriptions) {
      try {
        const didUpdate = await this.reconcileOne(subscription);
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
    };
    this.logger.log(
      `Reconciliation complete: checked=${result.checked} updated=${result.updated} errors=${result.errors}`,
    );
    return result;
  }

  private async reconcileOne(
    subscription: SubscriptionEntity,
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
      });
      return true;
    }

    if (!shouldApplyStripeSync(subscription, {})) return false;

    // Anti-flap guard: ExpireSubscriptionsUseCase can lock a subscription
    // locally (status: canceled) without touching Stripe (e.g. a past_due
    // grace-period lock). Without this guard, the next reconcile tick would
    // see Stripe still reporting past_due/canceled and "resurrect" the local
    // record back to a paying-adjacent state, and the following expire tick
    // would re-lock it — an endless flap. Only let Stripe override a local
    // cancellation when Stripe itself reports the org as actually paying
    // again (active/trialing); any other incoming status is not meaningful
    // drift to resolve.
    if (
      subscription.status === "canceled" &&
      normalized.status !== "active" &&
      normalized.status !== "trialing"
    ) {
      return false;
    }

    const hasDrift =
      subscription.status !== normalized.status ||
      subscription.billingInterval !== normalized.billingInterval ||
      subscription.priceCents !== normalized.priceCents ||
      subscription.stripePriceId !== normalized.stripePriceId ||
      subscription.stripeCouponId !== normalized.stripeCouponId ||
      subscription.discountPercent !== normalized.discountPercent ||
      subscription.trialEndsAt?.getTime() !==
        normalized.trialEndsAt?.getTime() ||
      subscription.currentPeriodStart?.getTime() !==
        normalized.currentPeriodStart?.getTime() ||
      subscription.currentPeriodEnd?.getTime() !==
        normalized.currentPeriodEnd?.getTime() ||
      subscription.canceledAt?.getTime() !== normalized.canceledAt?.getTime();

    if (!hasDrift) return false;

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
    });
    return true;
  }
}
