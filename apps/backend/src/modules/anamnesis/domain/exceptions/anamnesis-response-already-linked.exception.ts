import { DomainException } from "../../../../common/exceptions/domain.exception";

/** A resposta já está vinculada a outro `services.anamnesis_response_id` (índice único parcial). */
export class AnamnesisResponseAlreadyLinkedException extends DomainException {
  readonly code = "ANAMNESIS_RESPONSE_ALREADY_LINKED";

  constructor(responseId: string) {
    super(`Anamnesis response is already linked to a service: ${responseId}`);
  }
}
