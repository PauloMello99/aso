export const BILLING_INVOICE_EVENT_REPOSITORY = Symbol(
  "BILLING_INVOICE_EVENT_REPOSITORY",
);

export interface CreateBillingInvoiceEventData {
  stripeInvoiceId: string;
  orgId?: string | null;
  type: "paid" | "payment_failed";
  amountCents: number;
  currency: string;
  occurredAt: Date;
}

export interface IBillingInvoiceEventRepository {
  /**
   * Inserts a new invoice event. Uses INSERT ... ON CONFLICT DO NOTHING on
   * the (stripeInvoiceId, type) unique constraint, so replays of the same
   * Stripe webhook are idempotent.
   */
  create(data: CreateBillingInvoiceEventData): Promise<void>;
}
