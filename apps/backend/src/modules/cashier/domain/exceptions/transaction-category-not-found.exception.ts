import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TransactionCategoryNotFoundException extends DomainException {
  readonly code = "TRANSACTION_CATEGORY_NOT_FOUND";

  constructor(id: string) {
    super(`Transaction category not found: ${id}`);
  }
}
