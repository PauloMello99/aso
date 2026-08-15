import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TicketNotReopenableException extends DomainException {
  readonly code = "TICKET_NOT_REOPENABLE";

  constructor(id: string, status: string) {
    super(`Ticket ${id} cannot be reopened from status: ${status}`);
  }
}
