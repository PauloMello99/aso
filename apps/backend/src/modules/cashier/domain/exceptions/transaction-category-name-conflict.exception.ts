import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TransactionCategoryNameConflictException extends DomainException {
  readonly code = "TRANSACTION_CATEGORY_NAME_CONFLICT";

  constructor(name: string) {
    super(`Transaction category name "${name}" is already in use for this organization`);
  }
}
