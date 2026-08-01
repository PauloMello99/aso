import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TransactionIsServicePaymentException extends DomainException {
  readonly code = "TRANSACTION_IS_SERVICE_PAYMENT";

  constructor(id: string) {
    super(
      `Transaction ${id} belongs to a service payment; correct it from the Services screen.`,
    );
  }
}
