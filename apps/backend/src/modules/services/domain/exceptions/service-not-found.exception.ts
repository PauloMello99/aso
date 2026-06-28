import { DomainException } from "../../../../common/exceptions/domain.exception";

export class ServiceNotFoundException extends DomainException {
  readonly code = "SERVICE_NOT_FOUND";

  constructor(id: string) {
    super(`Service not found: ${id}`);
  }
}
