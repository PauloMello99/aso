import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisResponseAlreadyLinkedException extends DomainException {
  readonly code = "ANAMNESIS_RESPONSE_ALREADY_LINKED";

  constructor(responseId: string) {
    super(`Anamnesis response is already linked to a service: ${responseId}`);
  }
}
