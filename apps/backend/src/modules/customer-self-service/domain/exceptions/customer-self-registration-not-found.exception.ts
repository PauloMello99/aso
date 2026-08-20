import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CustomerSelfRegistrationNotFoundException extends DomainException {
  readonly code = "CUSTOMER_SELF_REGISTRATION_NOT_FOUND";

  constructor(idOrToken: string) {
    super(`Customer self-registration not found: ${idOrToken}`);
  }
}
