import { DomainException } from "../../../../common/exceptions/domain.exception";

export type StorageOperation = "remove" | "list";

// Mensagem fixa: nunca repassar texto do provider de storage (pode conter paths/PII).
export class StorageOperationFailedException extends DomainException {
  readonly code = "STORAGE_OPERATION_FAILED";

  constructor(readonly operation: StorageOperation) {
    super(`Storage ${operation} failed`);
  }
}
