import { DomainException } from "../../../../common/exceptions/domain.exception";

export class InvitationEmailFailedException extends DomainException {
  readonly code = "INVITATION_EMAIL_FAILED";

  constructor(email: string) {
    super(`Failed to send invitation email to ${email}`);
  }
}
