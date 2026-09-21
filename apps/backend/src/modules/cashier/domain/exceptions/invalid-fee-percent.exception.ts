import { DomainException } from "../../../../common/exceptions/domain.exception";

export class InvalidFeePercentException extends DomainException {
  readonly code = "INVALID_FEE_PERCENT";

  constructor(percent: string) {
    super(`Fee percent is not a valid number: "${percent}"`);
  }
}
