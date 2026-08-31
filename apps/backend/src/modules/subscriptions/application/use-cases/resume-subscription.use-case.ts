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
import { SubscriptionNotResumableException } from "../../domain/exceptions/subscription-not-resumable.exception";
import { SubscriptionNotScheduledForCancellationException } from "../../domain/exceptions/subscription-not-scheduled-for-cancellation.exception";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class ResumeSubscriptionUseCase {
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
    // so this guard also covers "cannot resume a courtesy".
    if (!subscription.isStripeLinked) {
      throw new SubscriptionNotStripeLinkedException(orgId);
    }

    if (!subscription.isActiveLike) {
      throw new SubscriptionNotResumableException(orgId);
    }

    // Asymmetric with schedule on purpose: the "Reactivate" action only surfaces
    // while the flag is true, so a false flag reaching this use-case is a genuine
    // stale state and earns a 409 instead of an idempotent no-op.
    if (!subscription.cancelAtPeriodEnd) {
      throw new SubscriptionNotScheduledForCancellationException(orgId);
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
        false,
      );

    // Narrow payload — write only the fields this toggle actually changes:
    // cancelAtPeriodEnd, canceledAt, currentPeriodEnd, status. This matches the
    // local discount convention: stripeCouponId/discountPercent are owned solely
    // by applyCouponToSubscription/removeSubscriptionDiscount and are never
    // written from other paths, so they stay out of this payload.
    // billingInterval/priceCents/trialEndsAt/currentPeriodStart are left out too
    // because the toggle does not affect them. Resume clears canceledAt (Stripe
    // nulls it alongside the flag), which is why it MUST be in the payload.
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
      metadata: { operation: "resume", cancelAtPeriodEnd: false },
    });

    return persisted;
  }
}
