import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisResponseOutdatedException extends DomainException {
  readonly code = "ANAMNESIS_RESPONSE_OUTDATED";

  constructor(responseId: string) {
    super(`Anamnesis response is outdated: ${responseId}`);
  }
}
