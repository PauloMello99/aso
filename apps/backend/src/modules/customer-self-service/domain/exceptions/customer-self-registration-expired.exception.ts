import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CustomerSelfRegistrationExpiredException extends DomainException {
  readonly code = "CUSTOMER_SELF_REGISTRATION_EXPIRED";

  constructor() {
    super("This customer self-registration link has expired");
  }
}
