import { DomainException } from "../../../../common/exceptions/domain.exception";

export class MaterialServiceTypeInvalidException extends DomainException {
  readonly code = "MATERIAL_SERVICE_TYPE_INVALID";

  constructor() {
    super("One or more service type ids are invalid for this organization");
  }
}
