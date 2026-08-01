import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisInviteEmailFailedException extends DomainException {
  readonly code = "ANAMNESIS_INVITE_EMAIL_FAILED";

  constructor(email: string) {
    super(`Failed to send anamnesis invite email to ${email}`);
  }
}
