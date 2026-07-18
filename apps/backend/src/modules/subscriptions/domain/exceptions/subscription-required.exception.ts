import { DomainException } from "../../../../common/exceptions/domain.exception";

export class SubscriptionRequiredException extends DomainException {
  readonly code = "SUBSCRIPTION_REQUIRED";

  constructor(message = "An active subscription is required") {
    super(message);
  }
}
