import { DomainException } from "../../../../common/exceptions/domain.exception";

export class MemberNotFoundException extends DomainException {
  readonly code = "MEMBER_NOT_FOUND";

  constructor(memberId: string) {
    super(`Member not found: ${memberId}`);
  }
}
