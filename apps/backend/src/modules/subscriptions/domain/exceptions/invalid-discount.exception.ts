import { DomainException } from "../../../../common/exceptions/domain.exception";

export class InvalidDiscountException extends DomainException {
  readonly code = "INVALID_DISCOUNT";

  constructor(message = "Invalid discount percentage") {
    super(message);
  }
}
