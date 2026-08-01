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
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class RemoveDiscountUseCase {
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

    if (!subscription.isStripeLinked || !subscription.stripeSubscriptionId) {
      throw new SubscriptionNotStripeLinkedException(orgId);
    }

    await this.paymentGateway.removeSubscriptionDiscount(
      subscription.stripeSubscriptionId,
    );

    const updated = await this.subscriptionRepo.update(orgId, {
      stripeCouponId: null,
      discountPercent: null,
    });

    await this.auditService.logByAuthId(actorAuthId, {
      orgId,
      action: "subscription_changed",
      entityType: "subscription",
      entityId: subscription.id,
      metadata: { operation: "remove_discount" },
    });

    return updated;
  }
}
