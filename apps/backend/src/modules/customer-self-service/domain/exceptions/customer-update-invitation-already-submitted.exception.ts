import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CustomerUpdateInvitationAlreadySubmittedException extends DomainException {
  readonly code = "CUSTOMER_UPDATE_INVITATION_ALREADY_SUBMITTED";

  constructor() {
    super("This customer update invitation has already been submitted");
  }
}
