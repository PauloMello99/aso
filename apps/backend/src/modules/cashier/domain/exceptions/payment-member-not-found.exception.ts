import { DomainException } from "../../../../common/exceptions/domain.exception";

export class PaymentMemberNotFoundException extends DomainException {
  readonly code = "PAYMENT_MEMBER_NOT_FOUND";

  constructor(userId: string) {
    super(`Member is not an active member of this organization: ${userId}`);
  }
}
