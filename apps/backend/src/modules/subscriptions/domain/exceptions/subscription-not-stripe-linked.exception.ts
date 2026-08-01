import { DomainException } from "../../../../common/exceptions/domain.exception";

export class SubscriptionNotStripeLinkedException extends DomainException {
  readonly code = "SUBSCRIPTION_NOT_STRIPE_LINKED";

  constructor(orgId: string) {
    super(`Subscription for org ${orgId} is not linked to Stripe`);
  }
}
