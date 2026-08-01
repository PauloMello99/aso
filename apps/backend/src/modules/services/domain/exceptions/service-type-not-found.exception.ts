import { DomainException } from "../../../../common/exceptions/domain.exception";

export class ServiceTypeNotFoundException extends DomainException {
  readonly code = "SERVICE_TYPE_NOT_FOUND";

  constructor(id: string) {
    super(`Service type not found: ${id}`);
  }
}
