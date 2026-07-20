import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisResponseExpiredException extends DomainException {
  readonly code = "ANAMNESIS_RESPONSE_EXPIRED";

  constructor() {
    super("This anamnesis link has expired");
  }
}
