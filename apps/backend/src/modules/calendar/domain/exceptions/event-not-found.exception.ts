import { DomainException } from "../../../../common/exceptions/domain.exception";

export class EventNotFoundException extends DomainException {
  readonly code = "CALENDAR_EVENT_NOT_FOUND";

  constructor(id: string) {
    super(`Calendar event not found: ${id}`);
  }
}
