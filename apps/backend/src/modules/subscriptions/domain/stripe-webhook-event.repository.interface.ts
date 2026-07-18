export const STRIPE_WEBHOOK_EVENT_REPOSITORY = Symbol(
  "STRIPE_WEBHOOK_EVENT_REPOSITORY",
);

export interface IStripeWebhookEventRepository {
  /**
   * Attempts to claim (insert) the raw Stripe event id for processing.
   * Uses INSERT ... ON CONFLICT DO NOTHING under the hood. Returns `true`
   * when this call actually inserted the row (i.e. this is the first time
   * the event is being processed), `false` if it was already claimed.
   */
  claim(id: string, type: string): Promise<boolean>;
  markProcessed(id: string): Promise<void>;
}
