import { DomainException } from "../../../../common/exceptions/domain.exception";

export type QuoteRequestInvalidReason =
  | "image_type"
  | "image_size"
  | "image_count"
  | "consent_required"
  | "consent_version"
  | "slug_invalid";

// Sem PII em message/details: so o motivo.
export class QuoteRequestInvalidException extends DomainException {
  readonly code = "QUOTE_REQUEST_INVALID";

  constructor(reason: QuoteRequestInvalidReason) {
    super("Quote request is invalid", { reason });
  }
}
