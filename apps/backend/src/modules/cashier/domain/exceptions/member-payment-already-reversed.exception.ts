import { DomainException } from "../../../../common/exceptions/domain.exception";

export class MemberPaymentAlreadyReversedException extends DomainException {
  readonly code = "MEMBER_PAYMENT_ALREADY_REVERSED";

  constructor(id: string) {
    super(`Member payment already reversed: ${id}`);
  }
}
