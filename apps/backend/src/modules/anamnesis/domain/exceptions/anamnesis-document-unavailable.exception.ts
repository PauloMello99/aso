import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisDocumentUnavailableException extends DomainException {
  readonly code = "ANAMNESIS_DOCUMENT_UNAVAILABLE";

  constructor() {
    super("The signed anamnesis document is unavailable");
  }
}
