import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisResponseNotLinkableException extends DomainException {
  readonly code = "ANAMNESIS_RESPONSE_NOT_LINKABLE";

  constructor(responseId: string) {
    super(`Anamnesis response is not linkable: ${responseId}`);
  }
}
