import { DomainException } from "../../../../common/exceptions/domain.exception";

export class MaterialInUseException extends DomainException {
  readonly code = "MATERIAL_IN_USE_BY_SERVICES";

  constructor(id: string) {
    super(
      `Material ${id} is linked to one or more services and cannot be deleted`,
    );
  }
}
