export const BILLING_REFUND_EVENT_REPOSITORY = Symbol(
  "BILLING_REFUND_EVENT_REPOSITORY",
);

export type BillingRefundEventStatus =
  | "pending"
  | "requires_action"
  | "succeeded"
  | "failed"
  | "canceled";

export interface CreateBillingRefundEventData {
  stripeRefundId: string;
  stripeChargeId?: string | null;
  orgId?: string | null;
  status: BillingRefundEventStatus;
  amountCents: number;
  currency: string;
  reason?: string | null;
  occurredAt: Date;
}

export interface BillingRefundEventEntity {
  id: string;
  stripeRefundId: string;
  stripeChargeId: string | null;
  orgId: string | null;
  status: BillingRefundEventStatus;
  amountCents: number;
  currency: string;
  reason: string | null;
  occurredAt: Date;
  createdAt: Date;
}

export interface IBillingRefundEventRepository {
  /**
   * Inserts a new refund event. Uses INSERT ... ON CONFLICT DO NOTHING on the
   * (stripeRefundId, status) unique constraint, so replays of the same Stripe
   * webhook are idempotent. Rows are immutable (append-only, by analogy with
   * ADR-0010) — never UPDATE/DELETE.
   */
  create(data: CreateBillingRefundEventData): Promise<void>;
  /**
   * Lists this org's refund events, newest first. Read is local because Stripe
   * has no list-by-customer endpoint for refunds.
   */
  listByOrgId(orgId: string): Promise<BillingRefundEventEntity[]>;
}
