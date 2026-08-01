import { DomainException } from "../../../../common/exceptions/domain.exception";

export class WebhookSignatureInvalidException extends DomainException {
  readonly code = "WEBHOOK_SIGNATURE_INVALID";

  constructor(message = "Invalid webhook signature") {
    super(message);
  }
}
