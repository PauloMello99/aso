import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CustomerDisabledException extends DomainException {
  readonly code = "CUSTOMER_DISABLED";

  constructor(id: string) {
    super(`Customer is disabled: ${id}`);
  }
}
