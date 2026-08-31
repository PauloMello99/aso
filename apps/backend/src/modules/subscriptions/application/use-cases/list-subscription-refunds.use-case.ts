import { Inject, Injectable } from "@nestjs/common";
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY,
} from "../../domain/subscription.repository.interface";
import {
  BILLING_REFUND_EVENT_REPOSITORY,
  BillingRefundEventEntity,
  IBillingRefundEventRepository,
} from "../../domain/billing-refund-event.repository.interface";
import { SubscriptionNotFoundException } from "../../domain/exceptions/subscription-not-found.exception";

@Injectable()
export class ListSubscriptionRefundsUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(BILLING_REFUND_EVENT_REPOSITORY)
    private readonly refundEventRepo: IBillingRefundEventRepository,
  ) {}

  /**
   * Reads from the LOCAL `billing_refund_events` table, not from Stripe — the
   * Stripe API has no list-by-customer endpoint for refunds. Refund rows with a
   * null `org_id` (not yet correlated to an org) never surface here; recovering
   * those is reconciliation work (T4-F5).
   */
  async execute(orgId: string): Promise<BillingRefundEventEntity[]> {
    const subscription = await this.subscriptionRepo.findByOrgId(orgId);
    if (!subscription) throw new SubscriptionNotFoundException(orgId);

    return this.refundEventRepo.listByOrgId(orgId);
  }
}
