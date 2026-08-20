import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CustomerUpdateInvitationInviteEmailFailedException extends DomainException {
  readonly code = "CUSTOMER_UPDATE_INVITATION_INVITE_EMAIL_FAILED";

  constructor(email: string) {
    super(`Failed to send customer update invitation email to ${email}`);
  }
}
