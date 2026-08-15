import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TicketAttachmentNotFoundException extends DomainException {
  readonly code = "TICKET_ATTACHMENT_NOT_FOUND";

  constructor(id: string) {
    super(`Ticket attachment not found: ${id}`);
  }
}
