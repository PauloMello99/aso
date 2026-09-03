import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Já existe uma campanha da org para o gatilho informado — viola a unique
 * `campaigns_org_trigger_uq` (uma campanha por gatilho por org). Lançada tanto
 * pelo pré-check do `CreateCampaignUseCase` quanto pela tradução do 23505 no
 * `DrizzleCampaignRepository.create` (guarda contra a corrida). Mensagem
 * genérica: não ecoa o gatilho nem confirma a org. O registro em
 * `DOMAIN_CODE_TO_STATUS` (→ 409) é feito no passo 7.
 */
export class CampaignTriggerAlreadyUsedException extends DomainException {
  readonly code = "CAMPAIGN_TRIGGER_ALREADY_USED";

  constructor() {
    super("A campaign already exists for this trigger");
  }
}
