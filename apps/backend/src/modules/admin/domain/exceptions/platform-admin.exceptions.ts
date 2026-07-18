import { DomainException } from "../../../../common/exceptions/domain.exception";

export class PlatformTargetNotFoundException extends DomainException {
  readonly code = "PLATFORM_TARGET_NOT_FOUND";

  constructor(what: string) {
    super(`Platform target not found: ${what}`);
  }
}

export class CannotChangeOwnPlatformRoleException extends DomainException {
  readonly code = "CANNOT_CHANGE_OWN_PLATFORM_ROLE";

  constructor() {
    super("You cannot change your own platform role");
  }
}
