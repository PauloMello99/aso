import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TransactionNotFoundException extends DomainException {
  readonly code = "TRANSACTION_NOT_FOUND";

  constructor(id: string) {
    super(`Transaction not found: ${id}`);
  }
}
