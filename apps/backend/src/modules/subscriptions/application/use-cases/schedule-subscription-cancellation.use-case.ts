import { Inject, Injectable } from "@nestjs/common";
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY,
} from "../../domain/subscription.repository.interface";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import type { SubscriptionEntity } from "../../domain/subscription.entity";
import { SubscriptionNotFoundException } from "../../domain/exceptions/subscription-not-found.exception";
import { SubscriptionNotStripeLinkedException } from "../../domain/exceptions/subscription-not-stripe-linked.exception";
import { SubscriptionNotCancelableException } from "../../domain/exceptions/subscription-not-cancelable.exception";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class ScheduleSubscriptionCancellationUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    orgId: string,
    actorAuthId: string,
  ): Promise<SubscriptionEntity> {
    const subscription = await this.subscriptionRepo.findByOrgId(orgId);
    if (!subscription) throw new SubscriptionNotFoundException(orgId);

    // A comp subscription (type='custom') never carries a stripeSubscriptionId,
    // so this guard also covers "cannot schedule a cancellation on a courtesy".
    if (!subscription.isStripeLinked) {
      throw new SubscriptionNotStripeLinkedException(orgId);
    }

    if (!subscription.isActiveLike) {
      throw new SubscriptionNotCancelableException(orgId);
    }

    // Scheduling twice is a double-click on a destructive flow, not an error to
    // throw in the owner's face: return the current state unchanged, without
    // touching the gateway or writing an audit entry.
    if (subscription.cancelAtPeriodEnd) {
      return subscription;
    }

    // isStripeLinked already guarantees this is non-null, but the entity keeps
    // it as string | null — narrow with a local const rather than asserting.
    const stripeSubscriptionId = subscription.stripeSubscriptionId;
    if (!stripeSubscriptionId) {
      throw new SubscriptionNotStripeLinkedException(orgId);
    }

    const updated =
      await this.paymentGateway.updateSubscriptionCancelAtPeriodEnd(
        stripeSubscriptionId,
        true,
      );

    // Narrow payload — write only the fields this toggle actually changes:
    // cancelAtPeriodEnd, canceledAt, currentPeriodEnd, status. Toggling
    // cancel_at_period_end does not touch the discount, so stripeCouponId/
    // discountPercent are deliberately left out of this payload — the webhook
    // (syncNormalizedSubscription) and ReconcileSubscriptionsUseCase own the
    // discount mirror from the normalized Stripe block (ADR-0016, Addendum
    // 2026-08-31). billingInterval/priceCents/trialEndsAt/currentPeriodStart are
    // left out too because the toggle does not affect them. cancelAtPeriodEnd and
    // canceledAt MUST be written — Stripe sets both together with the flag.
    const persisted = await this.subscriptionRepo.update(orgId, {
      cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
      canceledAt: updated.canceledAt,
      currentPeriodEnd: updated.currentPeriodEnd,
      status: updated.status,
    });

    await this.auditService.logByAuthId(actorAuthId, {
      orgId,
      action: "subscription_changed",
      entityType: "subscription",
      entityId: subscription.id,
      metadata: { operation: "schedule_cancellation", cancelAtPeriodEnd: true },
    });

    return persisted;
  }
}
