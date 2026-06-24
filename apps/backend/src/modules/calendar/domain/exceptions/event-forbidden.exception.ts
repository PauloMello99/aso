import { DomainException } from "../../../../common/exceptions/domain.exception";

export class EventForbiddenException extends DomainException {
  readonly code = "CALENDAR_EVENT_FORBIDDEN";

  constructor() {
    super("Você só pode gerenciar os seus próprios eventos de agenda.");
  }
}
