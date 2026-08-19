import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CustomerUpdateInvitationExpiredException extends DomainException {
  readonly code = "CUSTOMER_UPDATE_INVITATION_EXPIRED";

  constructor() {
    super("This customer update invitation link has expired");
  }
}
