import { DomainException } from "../../../../common/exceptions/domain.exception";

export class InvitationNotPendingException extends DomainException {
  readonly code = "INVITATION_NOT_PENDING";

  constructor() {
    super("This invitation is no longer pending");
  }
}
