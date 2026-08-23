import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisResponseNotSubmittedException extends DomainException {
  readonly code = "ANAMNESIS_RESPONSE_NOT_SUBMITTED";

  constructor() {
    super("This anamnesis response has not been submitted yet");
  }
}
