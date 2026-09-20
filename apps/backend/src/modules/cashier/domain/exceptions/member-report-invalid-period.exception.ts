import { DomainException } from "../../../../common/exceptions/domain.exception";

export class MemberReportInvalidPeriodException extends DomainException {
  readonly code = "MEMBER_REPORT_INVALID_PERIOD";

  constructor(message: string) {
    super(message);
  }
}
