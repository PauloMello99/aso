import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisDocumentFetchFailedException extends DomainException {
  readonly code = "ANAMNESIS_DOCUMENT_FETCH_FAILED";

  constructor() {
    super("Failed to fetch the signed anamnesis document");
  }
}
