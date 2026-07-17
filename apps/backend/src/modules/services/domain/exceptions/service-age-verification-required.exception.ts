import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Tipo de serviço exige confirmação de maioridade e o cliente não tem 18 anos
 * completos na data do atendimento (ou não há dado suficiente para confirmar).
 */
export class ServiceAgeVerificationRequiredException extends DomainException {
  readonly code = "SERVICE_AGE_VERIFICATION_REQUIRED";

  constructor() {
    super(
      "Este tipo de serviço exige confirmação de que o cliente é maior de idade na data do atendimento.",
    );
  }
}
