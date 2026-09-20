import { DomainException } from "../../../../common/exceptions/domain.exception";

export class MemberFeeDuplicateKeyException extends DomainException {
  readonly code = "MEMBER_FEE_DUPLICATE_KEY";

  constructor(userId: string, paymentMethod: string, installments: number) {
    super(
      `Duplicate member fee key (user ${userId}, method ${paymentMethod}, installments ${installments}) in fees/deactivations`,
    );
  }
}
