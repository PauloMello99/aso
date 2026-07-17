import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AnamnesisFormNotConfiguredException extends DomainException {
  readonly code = "ANAMNESIS_FORM_NOT_CONFIGURED";

  constructor(serviceTypeId: string) {
    super(`No anamnesis form configured for service type: ${serviceTypeId}`);
  }
}
