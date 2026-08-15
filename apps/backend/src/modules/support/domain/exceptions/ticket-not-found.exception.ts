import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TicketNotFoundException extends DomainException {
  readonly code = "TICKET_NOT_FOUND";

  constructor(id: string) {
    super(`Ticket not found: ${id}`);
  }
}
