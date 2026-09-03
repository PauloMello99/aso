import { Inject, Injectable } from "@nestjs/common";
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY,
} from "../../domain/subscription.repository.interface";
import {
  BILLING_REFUND_EVENT_REPOSITORY,
  BillingRefundEventStatus,
  IBillingRefundEventRepository,
} from "../../domain/billing-refund-event.repository.interface";
import { SubscriptionNotFoundException } from "../../domain/exceptions/subscription-not-found.exception";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface SubscriptionRefundRow {
  stripeRefundId: string;
  stripeChargeId: string | null;
  status: BillingRefundEventStatus;
  amountCents: number;
  currency: string;
  reason: string | null;
  occurredAt: string;
}

export interface SubscriptionRefundsPage {
  data: SubscriptionRefundRow[];
  total: number;
  page: number;
  pages: number;
}

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
   * those is reconciliation work (T4-F5). The response drops the internal
   * `id`/`org_id` columns (ADR-0016).
   */
  async execute(
    orgId: string,
    query: { page?: number; limit?: number },
  ): Promise<SubscriptionRefundsPage> {
    const subscription = await this.subscriptionRepo.findByOrgId(orgId);
    if (!subscription) throw new SubscriptionNotFoundException(orgId);

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    const { rows, total } = await this.refundEventRepo.listPageByOrgId(orgId, {
      limit,
      offset,
    });
    const pages = Math.max(1, Math.ceil(total / limit));

    return {
      data: rows.map((row) => ({
        stripeRefundId: row.stripeRefundId,
        stripeChargeId: row.stripeChargeId,
        status: row.status,
        amountCents: row.amountCents,
        currency: row.currency,
        reason: row.reason,
        occurredAt: row.occurredAt.toISOString(),
      })),
      total,
      page,
      pages,
    };
  }
}
