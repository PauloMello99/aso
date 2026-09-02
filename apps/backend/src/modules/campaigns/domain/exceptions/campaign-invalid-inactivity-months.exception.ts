import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * O valor de `inactivityMonths` é incoerente com o gatilho da campanha (T6
 * rework, Fatias 6/7): ausente/não-finito para o gatilho `inactivity`, ou um
 * patch que zeraria a janela de uma campanha `inactivity` existente. Violaria o
 * CHECK `campaigns_inactivity_months_check`. A mensagem é genérica: nunca ecoa o
 * input do cliente. Registrada em `DOMAIN_CODE_TO_STATUS` (→ 400).
 */
export class CampaignInvalidInactivityMonthsException extends DomainException {
  readonly code = "CAMPAIGN_INVALID_INACTIVITY_MONTHS";

  constructor() {
    super("inactivityMonths inválido para o gatilho da campanha");
  }
}
