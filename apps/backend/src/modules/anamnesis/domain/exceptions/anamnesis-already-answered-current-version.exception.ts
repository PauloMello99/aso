import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisAlreadyAnsweredCurrentVersionException extends DomainException {
  readonly code = "ANAMNESIS_ALREADY_ANSWERED_CURRENT_VERSION";

  constructor(responseId: string, submittedAt: Date | null) {
    super("This customer has already answered the current anamnesis form version", {
      responseId,
      submittedAt: submittedAt?.toISOString() ?? "",
    });
  }
}
