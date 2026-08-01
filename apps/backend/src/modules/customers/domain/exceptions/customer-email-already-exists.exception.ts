import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CustomerEmailAlreadyExistsException extends DomainException {
  readonly code = "CUSTOMER_EMAIL_ALREADY_EXISTS";

  constructor(email: string) {
    super(`Já existe um cliente com este e-mail nesta organização: ${email}`);
  }
}
