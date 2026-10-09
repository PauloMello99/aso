import { DomainException } from "../../../../common/exceptions/domain.exception";

// Mensagem fixa: sem módulo 'schedule' ou agendamento para profissional diferente do alvo.
export class QuoteScheduleForbiddenException extends DomainException {
  readonly code = "QUOTE_SCHEDULE_FORBIDDEN";

  constructor() {
    super("Not allowed to schedule this quote request");
  }
}
