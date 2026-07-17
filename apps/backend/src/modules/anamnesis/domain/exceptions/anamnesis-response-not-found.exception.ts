import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisResponseNotFoundException extends DomainException {
  readonly code = "ANAMNESIS_RESPONSE_NOT_FOUND";

  constructor(idOrToken: string) {
    super(`Anamnesis response not found: ${idOrToken}`);
  }
}
