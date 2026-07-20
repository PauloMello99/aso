import { DomainException } from "../../../../common/exceptions/domain.exception";

export class ServiceMaterialRequiredException extends DomainException {
  readonly code = "SERVICE_MATERIAL_REQUIRED";

  constructor() {
    super("Nenhum consumo de material foi registrado.");
  }
}
