import { DomainException } from "../../../../common/exceptions/domain.exception";

export class MemberInactiveException extends DomainException {
  readonly code = "MEMBER_INACTIVE";

  constructor() {
    super("Não é possível transferir a organização para um membro inativo");
  }
}
