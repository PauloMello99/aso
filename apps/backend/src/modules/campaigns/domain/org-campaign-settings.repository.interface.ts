export const ORG_CAMPAIGN_SETTINGS_REPOSITORY = Symbol(
  "ORG_CAMPAIGN_SETTINGS_REPOSITORY",
);

export const ORG_CAMPAIGN_SETTINGS_WRITE_REPOSITORY = Symbol(
  "ORG_CAMPAIGN_SETTINGS_WRITE_REPOSITORY",
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

/**
 * Payload do upsert owner-scoped (T6 Bloco B, F1): todos os campos configuráveis
 * exceto `orgId` e timestamps. Os campos de texto já chegam normalizados pelo
 * use-case (`trim()`; vazio/whitespace -> `null`) — o repo escreve como recebe.
 */
export interface UpsertOrgCampaignSettingsData {
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
   * desligadas). Leitura cross-org do cron (`DRIZZLE_ADMIN`).
   */
  findByOrgId(orgId: string): Promise<OrgCampaignSettingsView | null>;
}

/**
 * Caminho de leitura/escrita da UI do dono (T6 Bloco B). Passa por `DRIZZLE`
 * normal + RLS: SELECT gated por `is_org_member`, INSERT/UPDATE por
 * `is_org_owner` (policies da migration 0062). NÃO reusa o repo `DRIZZLE_ADMIN`
 * do Bloco A, que é do cron cross-org.
 */
export interface IOrgCampaignSettingsWriteRepository {
  findByOrgId(orgId: string): Promise<OrgCampaignSettingsView | null>;
  upsert(
    orgId: string,
    data: UpsertOrgCampaignSettingsData,
  ): Promise<OrgCampaignSettingsView>;
}
