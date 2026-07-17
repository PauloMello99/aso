import { DomainException } from "../../../../common/exceptions/domain.exception";

/** Resposta inexistente/não `submitted` p/ o par cliente + tipo de serviço informado. */
export class AnamnesisResponseNotLinkableException extends DomainException {
  readonly code = "ANAMNESIS_RESPONSE_NOT_LINKABLE";

  constructor(responseId: string) {
    super(`Anamnesis response is not linkable: ${responseId}`);
  }
}
