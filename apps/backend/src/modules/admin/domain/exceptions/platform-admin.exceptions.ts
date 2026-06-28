import { DomainException } from "../../../../common/exceptions/domain.exception";

/** Alvo (org ou usuário) inexistente numa operação de plataforma. */
export class PlatformTargetNotFoundException extends DomainException {
  readonly code = "PLATFORM_TARGET_NOT_FOUND";

  constructor(what: string) {
    super(`Platform target not found: ${what}`);
  }
}

/** Um super_admin não pode rebaixar a si mesmo (evita lockout). */
export class CannotChangeOwnPlatformRoleException extends DomainException {
  readonly code = "CANNOT_CHANGE_OWN_PLATFORM_ROLE";

  constructor() {
    super("You cannot change your own platform role");
  }
}
