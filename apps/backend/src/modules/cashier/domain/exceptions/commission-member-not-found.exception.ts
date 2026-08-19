import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CommissionMemberNotFoundException extends DomainException {
  readonly code = "COMMISSION_MEMBER_NOT_FOUND";

  constructor(userId: string) {
    super(`Member is not an active member of this organization: ${userId}`);
  }
}
