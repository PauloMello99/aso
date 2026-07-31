import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisConsentRequiredException extends DomainException {
  readonly code = "ANAMNESIS_CONSENT_REQUIRED";

  constructor() {
    super("Explicit consent to the anamnesis term is required");
  }
}
