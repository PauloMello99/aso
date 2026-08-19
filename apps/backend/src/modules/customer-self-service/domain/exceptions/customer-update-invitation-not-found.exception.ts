import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CustomerUpdateInvitationNotFoundException extends DomainException {
  readonly code = "CUSTOMER_UPDATE_INVITATION_NOT_FOUND";

  constructor(idOrToken: string) {
    super(`Customer update invitation not found: ${idOrToken}`);
  }
}
