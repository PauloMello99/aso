import type {
  NormalizedSubscription,
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

/**
 * Anti-flap guard, applied symmetrically in HandleStripeWebhookUseCase and
 * ReconcileSubscriptionsUseCase: `ExpireSubscriptionsUseCase.lockExpiredPastDue`
 * can lock a subscription locally (status: canceled) without touching Stripe
 * (e.g. a past_due grace-period lock). Without this guard, the next
 * webhook/reconcile pass would see Stripe still reporting past_due/canceled and
 * "resurrect" the local record back to a paying-adjacent state, and the
 * following expire tick would re-lock it — an endless flap. Only let Stripe
 * override a local cancellation when Stripe itself reports the org as actually
 * paying again (active/trialing); any other incoming status is not meaningful
 * drift to resolve.
 */
export function shouldSkipStripeStatusOverride(
  currentStatus: SubscriptionStatus,
  incomingStatus: SubscriptionStatus,
): boolean {
  return (
    currentStatus === "canceled" &&
    incomingStatus !== "active" &&
    incomingStatus !== "trialing"
  );
}

/**
 * Decides whether an incoming Stripe-derived update should mark the local
 * subscription's trial as consumed. `trialConsumed` is write-once and must
 * only flip to true when Stripe itself confirms a trial happened (i.e.
 * `trial_end` came back populated on the subscription/checkout session) —
 * never at checkout-session *creation* time, since an abandoned checkout
 * would otherwise burn the trial for nothing. Because Stripe keeps
 * `trial_end` populated even after the trial converts to a paid period, a
 * delayed webhook still marks it correctly. This predicate never signals
 * "un-consume" — once true, it stays true.
 */
export function shouldMarkTrialConsumed(
  current: SubscriptionEntity,
  incoming: Pick<NormalizedSubscription, "trialEndsAt">,
): boolean {
  return !current.trialConsumed && incoming.trialEndsAt !== null;
}
