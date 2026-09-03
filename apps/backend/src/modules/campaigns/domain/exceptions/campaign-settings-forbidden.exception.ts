import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * O ator não é dono da org (nem `super_admin` agindo como dono, ADR-0013) e
 * tentou gravar `org_campaign_settings`. Espelha o double-check de owner do
 * upsert de taxas do caixa (`CashierForbiddenException`).
 */
export class CampaignSettingsForbiddenException extends DomainException {
  readonly code = "CAMPAIGN_SETTINGS_FORBIDDEN";

  constructor(
    message = "Only organization owners can configure campaign settings",
  ) {
    super(message);
  }
}
