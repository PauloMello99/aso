import { DomainException } from "../../../../common/exceptions/domain.exception";

export class ServiceNotPayableException extends DomainException {
  readonly code = "SERVICE_NOT_PAYABLE";

  constructor(id: string) {
    super(`Service is not payable (already paid or canceled): ${id}`);
  }
}
