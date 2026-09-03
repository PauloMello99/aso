import { DomainException } from "../../../../common/exceptions/domain.exception";

export class SubscriptionStripeMissingException extends DomainException {
  readonly code = "SUBSCRIPTION_STRIPE_MISSING";

  constructor(message = "The linked Stripe subscription no longer exists") {
    super(message);
  }
}
