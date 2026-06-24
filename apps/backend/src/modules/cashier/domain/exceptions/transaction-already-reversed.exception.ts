import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TransactionAlreadyReversedException extends DomainException {
  readonly code = "TRANSACTION_ALREADY_REVERSED";

  constructor(id: string) {
    super(`Transaction already reversed: ${id}`);
  }
}
