import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TransactionCategoryProtectedException extends DomainException {
  readonly code = "TRANSACTION_CATEGORY_PROTECTED";

  constructor(id: string) {
    super(`Transaction category ${id} is a default category and cannot be modified or deleted`);
  }
}
