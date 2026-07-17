import { DomainException } from "../../../../common/exceptions/domain.exception";

export class EventNotSharedException extends DomainException {
  readonly code = "CALENDAR_EVENT_NOT_SHARED";

  constructor() {
    super("Este evento não é compartilhado com a organização.");
  }
}
