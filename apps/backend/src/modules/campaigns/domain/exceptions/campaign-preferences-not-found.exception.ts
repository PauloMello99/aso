import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Token de descadastro não corresponde a nenhuma linha de preferências. A
 * mensagem é deliberadamente genérica (sem ecoar o token) — o endpoint público
 * de opt-out é anônimo e não deve confirmar a existência de um token.
 */
export class CampaignPreferencesNotFoundException extends DomainException {
  readonly code = "CAMPAIGN_PREFERENCES_NOT_FOUND";

  constructor() {
    super("Email preferences not found for the provided token");
  }
}
