export const ORG_CAMPAIGN_SETTINGS_REPOSITORY = Symbol(
  "ORG_CAMPAIGN_SETTINGS_REPOSITORY",
);

/**
 * Configuração de campanhas de uma org: liga/desliga por gatilho, janela de
 * inatividade e copy custom. Colunas de texto `null` significam "usar o default
 * autoral do produto".
 */
export interface OrgCampaignSettingsView {
  orgId: string;
  postServiceEnabled: boolean;
  birthdayEnabled: boolean;
  inactivityEnabled: boolean;
  inactivityMonths: number;
  postServiceSubject: string | null;
  postServiceBody: string | null;
  birthdaySubject: string | null;
  birthdayBody: string | null;
  inactivitySubject: string | null;
  inactivityBody: string | null;
}

export interface IOrgCampaignSettingsRepository {
  /**
   * Configuração da org, ou `null` quando não há linha (ausência = campanhas
   * desligadas). Só leitura no Bloco A — o upsert é Bloco B.
   */
  findByOrgId(orgId: string): Promise<OrgCampaignSettingsView | null>;
}
