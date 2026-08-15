import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TicketInvalidTransitionException extends DomainException {
  readonly code = "TICKET_INVALID_TRANSITION";

  constructor(id: string, from: string, to: string) {
    super(`Ticket ${id} cannot transition from ${from} to ${to}`);
  }
}
