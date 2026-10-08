import { DomainException } from "../../../../common/exceptions/domain.exception";

export class QuoteFormMembershipRequiredException extends DomainException {
  readonly code = "QUOTE_FORM_MEMBERSHIP_REQUIRED";

  constructor() {
    super("An active organization membership is required to configure a quote form");
  }
}
