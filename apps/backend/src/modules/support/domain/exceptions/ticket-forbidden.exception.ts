import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TicketForbiddenException extends DomainException {
  readonly code = "TICKET_FORBIDDEN";

  constructor(message = "You are not allowed to perform this action") {
    super(message);
  }
}
