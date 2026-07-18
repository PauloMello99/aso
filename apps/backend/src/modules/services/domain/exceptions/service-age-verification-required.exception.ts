import { DomainException } from "../../../../common/exceptions/domain.exception";

export class ServiceAgeVerificationRequiredException extends DomainException {
  readonly code = "SERVICE_AGE_VERIFICATION_REQUIRED";

  constructor() {
    super(
      "Este tipo de serviço exige confirmação de que o cliente é maior de idade na data do atendimento.",
    );
  }
}
