import { DomainException } from "../../../../common/exceptions/domain.exception";

export class ServiceAlreadyCanceledException extends DomainException {
  readonly code = "SERVICE_ALREADY_CANCELED";

  constructor(id: string) {
    super(`Service already canceled: ${id}`);
  }
}
