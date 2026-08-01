import { DomainException } from "../../../../common/exceptions/domain.exception";

export class PlanNotAvailableException extends DomainException {
  readonly code = "PLAN_NOT_AVAILABLE";

  constructor(message = "Billing plan is not available") {
    super(message);
  }
}
