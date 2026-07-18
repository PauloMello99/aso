import { DomainException } from "../../../../common/exceptions/domain.exception";

export class SubscriptionNotFoundException extends DomainException {
  readonly code = "SUBSCRIPTION_NOT_FOUND";

  constructor(orgId: string) {
    super(`Subscription not found for org: ${orgId}`);
  }
}
