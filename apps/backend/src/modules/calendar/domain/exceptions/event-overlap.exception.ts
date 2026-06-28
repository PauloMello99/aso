import { DomainException } from "../../../../common/exceptions/domain.exception";

export class EventOverlapException extends DomainException {
  readonly code = "CALENDAR_EVENT_OVERLAP";

  constructor() {
    super("Já existe um evento neste horário para este membro (conflito de agenda).");
  }
}
