export const CAMPAIGN_TARGET_REPOSITORY = Symbol("CAMPAIGN_TARGET_REPOSITORY");

/**
 * Um destinatário elegível de campanha, já com opt-out e dedupe aplicados EM SQL
 * (ver drizzle-campaign-target.repository). `orgId`/`customerId` são projetados
 * da MESMA linha de `customers` que originou o gatilho — `campaign_sends` não
 * tem FK que valide o par depois.
 *
 * `subjectOverride`/`bodyOverride` vêm das colunas de texto de
 * `org_campaign_settings` (D5): `null` = usar o default autoral do produto (a
 * Fatia 3 resolve custom vs default). São OBRIGATÓRIAS (`string | null`, não
 * opcionais) — o SELECT sempre as projeta.
 */
export interface CampaignTarget {
  orgId: string;
  orgName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  dedupeKey: string;
  serviceId: string | null;
  subjectOverride: string | null;
  bodyOverride: string | null;
}

export interface ICampaignTargetRepository {
  /**
   * Clientes com serviço não cancelado em `[since, until)`. Uma linha por
   * serviço (dedupe por `service_id`): 2 serviços na janela -> 2 linhas.
   */
  findPostServiceTargets(input: {
    since: Date;
    until: Date;
    limit: number;
  }): Promise<CampaignTarget[]>;
  /**
   * Clientes cujo aniversário (mês+dia) bate com `referenceDate`. `referenceDate`
   * já vem no fuso da org resolvido pelo chamador.
   */
  findBirthdayTargets(input: {
    referenceDate: Date;
    limit: number;
  }): Promise<CampaignTarget[]>;
  /**
   * Clientes cujo último serviço não cancelado é mais antigo que a janela de
   * inatividade da PRÓPRIA org (`org_campaign_settings.inactivity_months`).
   */
  findInactivityTargets(input: {
    referenceDate: Date;
    limit: number;
  }): Promise<CampaignTarget[]>;
}
