import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CashierForbiddenException extends DomainException {
  readonly code = "CASHIER_FORBIDDEN";

  constructor(message = "You are not allowed to perform this action") {
    super(message);
  }
}
