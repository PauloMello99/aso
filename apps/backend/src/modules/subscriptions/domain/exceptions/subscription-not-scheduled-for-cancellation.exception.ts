import { DomainException } from "../../../../common/exceptions/domain.exception";

export class SubscriptionNotScheduledForCancellationException extends DomainException {
  readonly code = "SUBSCRIPTION_NOT_SCHEDULED_FOR_CANCELLATION";

  constructor(orgId: string) {
    super(`Subscription for org ${orgId} is not scheduled for cancellation`);
  }
}
