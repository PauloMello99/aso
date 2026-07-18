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
import { AuditService } from "../../../audit/audit.service";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../../user/domain/user.repository.interface";

@Injectable()
export class GrantCompUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    orgId: string,
    reason: string,
    actorAuthId: string,
    expiresAt?: Date | null,
  ): Promise<SubscriptionEntity> {
    const subscription = await this.subscriptionRepo.findByOrgId(orgId);
    if (!subscription) throw new SubscriptionNotFoundException(orgId);

    if (subscription.stripeSubscriptionId) {
      await this.paymentGateway.cancelSubscription(
        subscription.stripeSubscriptionId,
      );
    }

    const actor = await this.userRepo.findByAuthId(actorAuthId);

    const updated = await this.subscriptionRepo.update(orgId, {
      type: "custom",
      status: "active",
      priceCents: 0,
      compReason: reason,
      compGrantedBy: actor?.id ?? null,
      compExpiresAt: expiresAt ?? null,
      stripeSubscriptionId: null,
      stripeCouponId: null,
      discountPercent: null,
    });

    await this.auditService.logByAuthId(actorAuthId, {
      orgId,
      action: "subscription_changed",
      entityType: "subscription",
      entityId: subscription.id,
      metadata: { operation: "grant_comp", reason, expiresAt },
    });

    return updated;
  }
}
