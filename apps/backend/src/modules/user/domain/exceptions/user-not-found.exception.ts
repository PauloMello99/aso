import { DomainException } from "../../../../common/exceptions/domain.exception";

export class UserNotFoundException extends DomainException {
  readonly code = "USER_NOT_FOUND";

  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
  }
}
