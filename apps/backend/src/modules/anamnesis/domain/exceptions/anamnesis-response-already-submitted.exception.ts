import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisResponseAlreadySubmittedException extends DomainException {
  readonly code = "ANAMNESIS_RESPONSE_ALREADY_SUBMITTED";

  constructor() {
    super("This anamnesis response has already been submitted");
  }
}
