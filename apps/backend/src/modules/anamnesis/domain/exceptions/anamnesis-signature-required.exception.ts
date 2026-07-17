import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisSignatureRequiredException extends DomainException {
  readonly code = "ANAMNESIS_SIGNATURE_REQUIRED";

  constructor(responseId: string) {
    super(`Anamnesis response ${responseId} requires a valid PNG signature`);
  }
}
