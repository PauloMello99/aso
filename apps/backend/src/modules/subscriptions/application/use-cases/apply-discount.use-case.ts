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
import { InvalidDiscountException } from "../../domain/exceptions/invalid-discount.exception";
import { AuditService } from "../../../audit/audit.service";

export interface ApplyDiscountParams {
  percentOff: number;
  durationMonths?: number;
}

@Injectable()
export class ApplyDiscountUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    orgId: string,
    params: ApplyDiscountParams,
    actorAuthId: string,
  ): Promise<SubscriptionEntity> {
    const { percentOff, durationMonths } = params;

    if (
      !Number.isInteger(percentOff) ||
      percentOff < 1 ||
      percentOff > 100
    ) {
      throw new InvalidDiscountException(
        "percentOff must be an integer between 1 and 100",
      );
    }
    if (
      durationMonths !== undefined &&
      (!Number.isInteger(durationMonths) || durationMonths < 1)
    ) {
      throw new InvalidDiscountException(
        "durationMonths must be a positive integer",
      );
    }

    const subscription = await this.subscriptionRepo.findByOrgId(orgId);
    if (!subscription) throw new SubscriptionNotFoundException(orgId);

    if (!subscription.isStripeLinked || !subscription.stripeSubscriptionId) {
      throw new SubscriptionNotStripeLinkedException(orgId);
    }

    const { couponId } = await this.paymentGateway.createCoupon({
      percentOff,
      durationMonths,
      name: "Desconto administrativo",
    });

    await this.paymentGateway.applyCouponToSubscription(
      subscription.stripeSubscriptionId,
      couponId,
    );

    const updated = await this.subscriptionRepo.update(orgId, {
      stripeCouponId: couponId,
      discountPercent: percentOff,
    });

    await this.auditService.logByAuthId(actorAuthId, {
      orgId,
      action: "subscription_changed",
      entityType: "subscription",
      entityId: subscription.id,
      metadata: { operation: "apply_discount", percentOff, durationMonths },
    });

    return updated;
  }
}
