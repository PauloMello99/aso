import { DomainException } from "../../../../common/exceptions/domain.exception";

/** Usuário logado com e-mail diferente do convidado. */
export class InvitationEmailMismatchException extends DomainException {
  readonly code = "INVITATION_EMAIL_MISMATCH";

  constructor() {
    super("This invitation is addressed to a different email");
  }
}
