import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisResponseNoRecipientException extends DomainException {
  readonly code = "ANAMNESIS_RESPONSE_NO_RECIPIENT";

  constructor() {
    super("This anamnesis response has no recipient email to send to");
  }
}
