import { DomainException } from "../../../../common/exceptions/domain.exception";

/** Ex.: tentar estornar uma transação que já é, ela própria, um estorno. */
export class TransactionNotReversibleException extends DomainException {
  readonly code = "TRANSACTION_NOT_REVERSIBLE";

  constructor(id: string) {
    super(`Transaction cannot be reversed: ${id}`);
  }
}
