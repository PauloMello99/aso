import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TicketInvalidException extends DomainException {
  readonly code = "TICKET_INVALID";

  constructor(message: string) {
    super(message);
  }
}
