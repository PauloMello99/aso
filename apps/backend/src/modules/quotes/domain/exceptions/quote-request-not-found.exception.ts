import { DomainException } from "../../../../common/exceptions/domain.exception";

// Mensagem fixa: pedido inexistente, de outra org ou nao visivel ao chamador
// (funcionario x pedido de outro profissional) sao indistinguiveis.
export class QuoteRequestNotFoundException extends DomainException {
  readonly code = "QUOTE_REQUEST_NOT_FOUND";

  constructor() {
    super("Quote request not found");
  }
}
