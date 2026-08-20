import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CustomerSelfRegistrationInviteEmailFailedException extends DomainException {
  readonly code = "CUSTOMER_SELF_REGISTRATION_INVITE_EMAIL_FAILED";

  constructor(email: string) {
    super(`Failed to send customer self-registration invite email to ${email}`);
  }
}
