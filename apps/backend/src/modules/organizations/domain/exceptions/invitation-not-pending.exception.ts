import { DomainException } from "../../../../common/exceptions/domain.exception";

/** Convite já aceito/cancelado/expirado — não pode ser aceito de novo. */
export class InvitationNotPendingException extends DomainException {
  readonly code = "INVITATION_NOT_PENDING";

  constructor() {
    super("This invitation is no longer pending");
  }
}
