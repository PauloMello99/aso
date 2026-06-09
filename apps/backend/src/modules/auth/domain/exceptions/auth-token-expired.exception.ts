import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AuthTokenExpiredException extends DomainException {
  readonly code = "AUTH_TOKEN_EXPIRED";

  constructor(message = "Invalid or expired token") {
    super(message);
  }
}
