import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TicketCategoryInvalidException extends DomainException {
  readonly code = "TICKET_CATEGORY_INVALID";

  constructor(id: string) {
    super(`Ticket category is invalid or disabled: ${id}`);
  }
}
