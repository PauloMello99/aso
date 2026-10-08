import { DomainException } from "../../../../common/exceptions/domain.exception";

// Mensagem fixa e identica para slug inexistente, desativado, membro
// desabilitado ou org suspensa (anti-enumeracao). Sem o slug em details.
export class QuoteFormNotFoundException extends DomainException {
  readonly code = "QUOTE_FORM_NOT_FOUND";

  constructor() {
    super("Quote form not found");
  }
}
