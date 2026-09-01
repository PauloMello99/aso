import type { CampaignTrigger } from "./campaign-trigger";

export const CUSTOMER_EMAIL_PREFERENCE_REPOSITORY = Symbol(
  "CUSTOMER_EMAIL_PREFERENCE_REPOSITORY",
);

/**
 * Projeção mínima servida ao endpoint público de opt-out (sem sessão): só o que
 * a página de "gerenciar preferências" precisa mostrar. Deliberadamente SEM
 * `id`, `customerId` nem `unsubscribeToken` — o token já está na URL e os ids
 * internos não devem vazar para um contexto não autenticado.
 */
export interface CustomerEmailPreferenceView {
  orgId: string;
  orgName: string;
  postServiceEnabled: boolean;
  birthdayEnabled: boolean;
  inactivityEnabled: boolean;
  unsubscribedAll: boolean;
}

export interface ICustomerEmailPreferenceRepository {
  /**
   * Garante uma linha de preferências para `(customerId, orgId)` e devolve o
   * `unsubscribeToken` dela. Idempotente: `INSERT ... ON CONFLICT DO NOTHING`
   * sobre a unique `(customer_id, org_id)`; se a linha já existia, faz o SELECT
   * do token na mesma conexão. O token é gerado só pelo DEFAULT do banco e
   * nunca rotaciona (viaja em links de e-mails já entregues — LGPD).
   */
  ensureForCustomer(
    customerId: string,
    orgId: string,
  ): Promise<{ unsubscribeToken: string }>;
  /**
   * Preferências + nome da org por `unsubscribeToken`. `null` quando o token
   * não corresponde a nenhuma linha.
   */
  findByUnsubscribeToken(
    token: string,
  ): Promise<CustomerEmailPreferenceView | null>;
  /**
   * Marca opt-out global. Idempotente: uma 2ª chamada com o mesmo token também
   * devolve `true`. `false` só quando o token não existe.
   */
  unsubscribeAll(token: string, at: Date): Promise<boolean>;
  /**
   * Desliga um único gatilho para o cliente dono do token. Idempotente; `false`
   * só quando o token não existe.
   */
  unsubscribeTrigger(token: string, trigger: CampaignTrigger): Promise<boolean>;
}
