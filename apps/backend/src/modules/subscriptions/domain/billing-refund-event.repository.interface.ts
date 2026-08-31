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
  /**
   * First org id already resolved for this `stripe_refund_id` (a row with
   * `org_id IS NOT NULL`). Exists to avoid a `charges.retrieve` per event;
   * returning `null` is normal (refund of a charge we never mirrored).
   */
  findResolvedOrgIdByRefundId(stripeRefundId: string): Promise<string | null>;
  /**
   * First org id already resolved for this `stripe_charge_id` (a row with
   * `org_id IS NOT NULL`). All rows for a charge resolve to the same org, so
   * any match is equivalent and `LIMIT 1` needs no ordering. Exists to avoid a
   * `charges.retrieve` per event; returning `null` is normal (refund of a
   * charge we never mirrored).
   */
  findResolvedOrgIdByChargeId(stripeChargeId: string): Promise<string | null>;
}
