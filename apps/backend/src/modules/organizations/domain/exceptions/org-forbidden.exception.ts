import { DomainException } from "../../../../common/exceptions/domain.exception";

export class OrgForbiddenException extends DomainException {
  readonly code = "ORG_FORBIDDEN";

  constructor() {
    super("You do not have permission to perform this action");
  }
}
