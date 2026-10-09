import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Já existe um evento criado a partir da mesma origem (pedido de orçamento) —
 * viola a unique `calendar_events_source_quote_request_uq`. Mensagem fixa, sem
 * ecoar ids.
 */
export class CalendarEventSourceConflictException extends DomainException {
  readonly code = "CALENDAR_EVENT_SOURCE_CONFLICT";

  constructor() {
    super("Calendar event already exists for this source");
  }
}
