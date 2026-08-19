import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CustomerSelfRegistrationAlreadySubmittedException extends DomainException {
  readonly code = "CUSTOMER_SELF_REGISTRATION_ALREADY_SUBMITTED";

  constructor() {
    super("This customer self-registration has already been submitted");
  }
}
