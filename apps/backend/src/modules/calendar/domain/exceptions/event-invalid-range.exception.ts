import { DomainException } from "../../../../common/exceptions/domain.exception";

export class EventInvalidRangeException extends DomainException {
  readonly code = "CALENDAR_EVENT_INVALID_RANGE";

  constructor() {
    super("O horário de término deve ser depois do horário de início.");
  }
}
