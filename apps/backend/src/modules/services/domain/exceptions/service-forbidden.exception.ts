import { DomainException } from "../../../../common/exceptions/domain.exception";

export class ServiceForbiddenException extends DomainException {
  readonly code = "SERVICE_FORBIDDEN";

  constructor(message = "You are not allowed to perform this action") {
    super(message);
  }
}
