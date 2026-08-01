import type {
  SubscriptionEntity,
  SubscriptionEntityProps,
  SubscriptionStatus,
} from "./subscription.entity";

/**
 * Maps Stripe's subscription status vocabulary to the 4 local statuses.
 * Any status that means "not paying and not trialing" collapses to canceled.
 */
export function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "canceled";
    default:
      return "canceled";
  }
}

/**
 * Decides whether an incoming Stripe-derived update should be applied on top
 * of the current local subscription state. A local comp/isenção (`custom`)
 * subscription must never be downgraded by an out-of-order or delayed Stripe
 * webhook event.
 */
export function shouldApplyStripeSync(
  current: SubscriptionEntity,
  incoming: Partial<SubscriptionEntityProps>,
): boolean {
  // `incoming` is accepted for signature parity with future staleness/
  // ordering checks; today the only guard is against downgrading a local
  // comp (custom) subscription via a delayed/out-of-order Stripe event.
  void incoming;
  if (current.type === "custom") return false;
  return true;
}
