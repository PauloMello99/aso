import { DomainException } from "../../../../common/exceptions/domain.exception";

export class QuoteFormSlugUnavailableException extends DomainException {
  readonly code = "QUOTE_FORM_SLUG_UNAVAILABLE";

  constructor() {
    super("Quote form slug is unavailable");
  }
}
