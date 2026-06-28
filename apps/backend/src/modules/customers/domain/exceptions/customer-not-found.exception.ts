import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CustomerNotFoundException extends DomainException {
  readonly code = "CUSTOMER_NOT_FOUND";

  constructor(id: string) {
    super(`Customer not found: ${id}`);
  }
}
