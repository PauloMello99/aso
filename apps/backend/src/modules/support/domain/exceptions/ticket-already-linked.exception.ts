import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TicketAlreadyLinkedException extends DomainException {
  readonly code = "TICKET_ALREADY_LINKED";

  constructor(id: string) {
    super(`Ticket already linked to an organization: ${id}`);
  }
}
