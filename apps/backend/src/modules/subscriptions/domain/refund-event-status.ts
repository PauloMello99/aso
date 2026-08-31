import type { BillingRefundEventStatus } from "./billing-refund-event.repository.interface";

const REFUND_EVENT_STATUSES: readonly BillingRefundEventStatus[] = [
  "pending",
  "requires_action",
  "succeeded",
  "failed",
  "canceled",
];

/**
 * Whitelists Stripe's open-string `refund.status` down to the five values the
 * `billing_refund_events.status` enum persists. A value outside that set must
 * be dropped, not written — an unknown enum value would fail the INSERT and
 * 500 the webhook in a retry loop (precedent: `handleCouponUpserted` on a
 * fractional `percent_off`).
 *
 * Shared by `HandleStripeWebhookUseCase` (the per-event mirror) and
 * `ReconcileRefundsUseCase` (the global refund scan) so both apply the exact
 * same mapping.
 */
export function toRefundEventStatus(
  raw: string | null,
): BillingRefundEventStatus | null {
  return REFUND_EVENT_STATUSES.find((candidate) => candidate === raw) ?? null;
}
