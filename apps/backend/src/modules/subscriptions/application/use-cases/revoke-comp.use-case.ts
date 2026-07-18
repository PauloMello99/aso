import { Inject, Injectable } from "@nestjs/common";
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY,
} from "../../domain/subscription.repository.interface";
import type { SubscriptionEntity } from "../../domain/subscription.entity";
import { SubscriptionNotFoundException } from "../../domain/exceptions/subscription-not-found.exception";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class RevokeCompUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    orgId: string,
    actorAuthId: string,
  ): Promise<SubscriptionEntity> {
    const subscription = await this.subscriptionRepo.findByOrgId(orgId);
    if (!subscription) throw new SubscriptionNotFoundException(orgId);

    const updated = await this.subscriptionRepo.update(orgId, {
      type: "free",
      status: "canceled",
      priceCents: null,
      compReason: null,
      compGrantedBy: null,
      compExpiresAt: null,
    });

    await this.auditService.logByAuthId(actorAuthId, {
      orgId,
      action: "subscription_changed",
      entityType: "subscription",
      entityId: subscription.id,
      metadata: { operation: "revoke_comp" },
    });

    return updated;
  }
}
