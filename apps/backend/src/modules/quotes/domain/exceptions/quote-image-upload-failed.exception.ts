import { DomainException } from "../../../../common/exceptions/domain.exception";

// Mensagem fixa e generica: nunca repassar texto do provider de storage.
export class QuoteImageUploadFailedException extends DomainException {
  readonly code = "QUOTE_IMAGE_UPLOAD_FAILED";

  constructor() {
    super("Não foi possível enviar as imagens. Tente novamente.");
  }
}
