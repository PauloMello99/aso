import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Upload de imagem de campanha com `content-type` fora do conjunto suportado
 * pelo bucket `campaign-images` (jpeg/png/webp/gif). O `ParseFilePipe` do
 * controller já barra o mime antes; esta é a defesa de dentro do use-case, que
 * nunca lança exceção HTTP direta — só `DomainException` (código em
 * `DOMAIN_CODE_TO_STATUS` → 415).
 */
export class CampaignImageUnsupportedTypeException extends DomainException {
  readonly code = "CAMPAIGN_IMAGE_UNSUPPORTED_TYPE";

  constructor(contentType: string) {
    super(`Unsupported campaign image content type: ${contentType}`);
  }
}
