import { DomainException } from "../../../../common/exceptions/domain.exception";

export class OverviewInvalidPeriodException extends DomainException {
  readonly code = "OVERVIEW_INVALID_PERIOD";

  constructor(message: string) {
    super(message);
  }
}
