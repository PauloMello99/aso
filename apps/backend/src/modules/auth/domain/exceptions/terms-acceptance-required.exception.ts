import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TermsAcceptanceRequiredException extends DomainException {
  readonly code = "TERMS_ACCEPTANCE_REQUIRED";

  constructor() {
    super("Acceptance of the current terms version is required");
  }
}
