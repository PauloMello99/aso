import { DomainException } from "../../../../common/exceptions/domain.exception";

export class SubscriptionNotCancelableException extends DomainException {
  readonly code = "SUBSCRIPTION_NOT_CANCELABLE";

  constructor(orgId: string) {
    super(`Subscription for org ${orgId} is not in a cancelable state`);
  }
}
