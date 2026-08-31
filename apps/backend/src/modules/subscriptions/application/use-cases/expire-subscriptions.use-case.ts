import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY,
} from "../../domain/subscription.repository.interface";
import { AuditService } from "../../../audit/audit.service";

export interface ExpireSubscriptionsResult {
  compsExpired: number;
  pastDueLocked: number;
}

/**
 * Cron safety net that revokes comp (custom) subscriptions past their
 * compExpiresAt, and locks (cancels) past_due subscriptions whose grace
 * period has elapsed. Trial expiry is not handled here: Stripe itself
 * transitions trialing -> active/past_due/canceled via webhook when a trial
 * ends, so ReconcileSubscriptionsUseCase already catches trial drift.
 */
@Injectable()
export class ExpireSubscriptionsUseCase {
  private readonly logger = new Logger(ExpireSubscriptionsUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(): Promise<ExpireSubscriptionsResult> {
    const compsExpired = await this.expireComps();
    const pastDueLocked = await this.lockExpiredPastDue();

    this.logger.log(
      `Expiry sweep complete: compsExpired=${compsExpired} pastDueLocked=${pastDueLocked}`,
    );

    return { compsExpired, pastDueLocked };
  }

  private async expireComps(): Promise<number> {
    const expiredComps = await this.subscriptionRepo.findExpiredComps();

    let count = 0;
    for (const subscription of expiredComps) {
      try {
        await this.subscriptionRepo.update(subscription.orgId, {
          type: "free",
          status: "canceled",
          priceCents: null,
          compReason: null,
          compGrantedBy: null,
          compExpiresAt: null,
          // The subscription has ended: a leftover cancelAtPeriodEnd=true would
          // be an unfaithful mirror (there is no pending "will cancel" anymore).
          cancelAtPeriodEnd: false,
        });
        await this.auditService.log({
          actorId: null,
          orgId: subscription.orgId,
          action: "subscription_changed",
          entityType: "subscription",
          entityId: subscription.id,
          metadata: { operation: "comp_expired" },
        });
        count += 1;
      } catch (error) {
        this.logger.error(
          `Failed to expire comp for org ${subscription.orgId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return count;
  }

  private async lockExpiredPastDue(): Promise<number> {
    const expiredPastDue = await this.subscriptionRepo.findExpiredPastDue();

    let count = 0;
    for (const subscription of expiredPastDue) {
      try {
        await this.subscriptionRepo.update(subscription.orgId, {
          status: "canceled",
          type: "free",
          // The subscription is locked/ended: a leftover cancelAtPeriodEnd=true
          // would be an unfaithful mirror (there is no pending "will cancel").
          cancelAtPeriodEnd: false,
        });
        await this.auditService.log({
          actorId: null,
          orgId: subscription.orgId,
          action: "subscription_changed",
          entityType: "subscription",
          entityId: subscription.id,
          metadata: { operation: "grace_period_expired" },
        });
        count += 1;
      } catch (error) {
        this.logger.error(
          `Failed to lock past_due subscription for org ${subscription.orgId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return count;
  }
}
