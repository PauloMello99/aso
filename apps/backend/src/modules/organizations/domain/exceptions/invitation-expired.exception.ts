import { DomainException } from "../../../../common/exceptions/domain.exception";

export class InvitationExpiredException extends DomainException {
  readonly code = "INVITATION_EXPIRED";

  constructor() {
    super("This invitation has expired");
  }
}
