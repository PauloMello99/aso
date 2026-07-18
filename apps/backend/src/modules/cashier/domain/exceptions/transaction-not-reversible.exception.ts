import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TransactionNotReversibleException extends DomainException {
  readonly code = "TRANSACTION_NOT_REVERSIBLE";

  constructor(id: string) {
    super(`Transaction cannot be reversed: ${id}`);
  }
}
