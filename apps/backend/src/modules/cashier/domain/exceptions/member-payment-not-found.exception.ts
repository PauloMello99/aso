import { DomainException } from "../../../../common/exceptions/domain.exception";

export class MemberPaymentNotFoundException extends DomainException {
  readonly code = "MEMBER_PAYMENT_NOT_FOUND";

  constructor(id: string) {
    super(`Member payment not found: ${id}`);
  }
}
