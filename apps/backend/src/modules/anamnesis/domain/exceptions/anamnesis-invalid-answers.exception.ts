import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisInvalidAnswersException extends DomainException {
  readonly code = "ANAMNESIS_INVALID_ANSWERS";

  constructor(reason: string) {
    super(`Invalid anamnesis answers: ${reason}`);
  }
}
