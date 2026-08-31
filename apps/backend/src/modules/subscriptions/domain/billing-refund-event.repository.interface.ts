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
   * One page of this org's refund events, newest first
   * (`occurred_at DESC, created_at DESC`), plus `total` — the unpaginated row
   * count for this `org_id`. Read is local because Stripe has no
   * list-by-customer endpoint for refunds.
   */
  listPageByOrgId(
    orgId: string,
    params: { limit: number; offset: number },
  ): Promise<{ rows: BillingRefundEventEntity[]; total: number }>;
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
  /**
   * Distinct `stripe_charge_id`s of rows still awaiting org correlation
   * (`org_id IS NULL` and `stripe_charge_id IS NOT NULL`), EXCLUDING any refund
   * that already has a resolved sibling row (another row with the same
   * `stripe_refund_id` and `org_id IS NOT NULL`). Without that exclusion the
   * orphan pass would keep re-finding a refund whose org was already resolved
   * on a different status row. Oldest refunds first (`occurred_at ASC`), capped
   * at `limit`. Returns the charge ids only.
   *
   * `since` bounds the scan to `occurred_at >= since`. Charges that are
   * permanently irresolvable (Stripe account shared with another product, or a
   * customer with no local subscription) are the oldest rows, so without a
   * lower bound they would occupy the head of every batch forever — starving
   * newer, resolvable orphans and spending a `charges.retrieve` per eternal
   * orphan on every tick.
   *
   * Note: a row with `stripe_charge_id IS NULL` that never gains a resolved
   * sibling is reachable by neither this pass nor
   * `backfillOrgIdFromResolvedSiblings`, and is not automatically recoverable.
   */
  listUnresolvedChargeIds(limit: number, since: Date): Promise<string[]>;
  /**
   * For each `stripe_refund_id` in `refundIds`, the set of statuses already
   * persisted for it, as a `Map<stripe_refund_id, status[]>`. One query for the
   * whole batch (no N+1) so reconciliation can decide whether a status
   * transition was already seen. An empty `refundIds` returns an empty map
   * without touching the database.
   */
  findStatusesByRefundIds(
    refundIds: string[],
  ): Promise<Map<string, BillingRefundEventStatus[]>>;
  /**
   * Backfills `org_id` on the rows for `stripeChargeId` that still have it
   * `NULL`, returning the number of rows updated.
   *
   * A sanctioned exception to this table's append-only rule (T4-F5 decision
   * D4), alongside `backfillOrgIdFromResolvedSiblings`. It NEVER alters
   * `status`, `amount_cents`, `occurred_at`, `reason` or any monetary value —
   * it only fills a correlation column (`org_id`) that was `NULL`. The
   * `org_id IS NULL` guard means an assignment already made is never
   * overwritten.
   *
   * Load-bearing invariant: not mixing orgs relies on
   * `subscriptions.stripe_customer_id` being UNIQUE (one charge -> one customer
   * -> at most one subscription -> one org). If that unique is dropped this
   * backfill can misattribute.
   */
  resolveOrgIdWhereNull(stripeChargeId: string, orgId: string): Promise<number>;
  /**
   * Backfills `org_id` on every row whose `org_id` is still `NULL` from a
   * sibling row that shares its `stripe_refund_id` and already carries a
   * non-null `org_id`. Set-based, keyed by `stripe_refund_id`; returns the
   * number of rows updated.
   *
   * This is the "per refund" counterpart of `resolveOrgIdWhereNull` (which
   * works "per charge"): it recovers a `pending` row written with
   * `org_id NULL` whose later `succeeded` row did resolve an org — a case
   * `listUnresolvedChargeIds` deliberately skips (it has a resolved sibling),
   * so `resolveOrgIdWhereNull` would otherwise never run for it and the
   * `pending` row would stay `org_id NULL` forever, invisible to
   * `listPageByOrgId`.
   *
   * Like `resolveOrgIdWhereNull` this is a sanctioned exception to this
   * table's append-only rule (T4-F5 decision D4): it fills the `org_id`
   * correlation column only where it was `NULL`, only from a local sibling
   * that already carries that `org_id`, and never touches `status`,
   * `amount_cents`, `occurred_at`, `reason` or any monetary value. Same
   * load-bearing invariant: correctness relies on
   * `subscriptions.stripe_customer_id` being UNIQUE.
   */
  backfillOrgIdFromResolvedSiblings(): Promise<number>;
}
