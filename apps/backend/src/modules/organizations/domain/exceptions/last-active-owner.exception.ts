import { DomainException } from "../../../../common/exceptions/domain.exception";

export class LastActiveOwnerException extends DomainException {
  readonly code = "LAST_ACTIVE_OWNER";

  constructor() {
    super("A organização precisa de pelo menos um proprietário ativo");
  }
}
