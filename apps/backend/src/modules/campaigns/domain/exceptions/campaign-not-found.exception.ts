import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Nenhuma campanha da org bate com o id informado. A mensagem é deliberadamente
 * genérica — não ecoa o id nem confirma a org. O registro em
 * `DOMAIN_CODE_TO_STATUS` (→ 404) é feito no passo 7.
 */
export class CampaignNotFoundException extends DomainException {
  readonly code = "CAMPAIGN_NOT_FOUND";

  constructor() {
    super("Campaign not found");
  }
}
