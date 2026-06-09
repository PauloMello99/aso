import { DomainException } from "../../../../common/exceptions/domain.exception";

export class InvitationNotFoundException extends DomainException {
  readonly code = "INVITATION_NOT_FOUND";

  constructor(invitationId: string) {
    super(`Invitation not found: ${invitationId}`);
  }
}
