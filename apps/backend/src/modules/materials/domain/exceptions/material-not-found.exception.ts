import { DomainException } from "../../../../common/exceptions/domain.exception";

export class MaterialNotFoundException extends DomainException {
  readonly code = "MATERIAL_NOT_FOUND";

  constructor(id: string) {
    super(`Material not found: ${id}`);
  }
}

