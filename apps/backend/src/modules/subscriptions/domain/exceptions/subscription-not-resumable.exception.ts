import { DomainException } from "../../../../common/exceptions/domain.exception";

export class SubscriptionNotResumableException extends DomainException {
  readonly code = "SUBSCRIPTION_NOT_RESUMABLE";

  constructor(orgId: string) {
    super(`Subscription for org ${orgId} is not in a resumable state`);
  }
}
