import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TicketAttachmentInvalidException extends DomainException {
  readonly code = "TICKET_ATTACHMENT_INVALID";

  constructor(message: string) {
    super(message);
  }
}
