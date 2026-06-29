export const EMAIL_SENDER = Symbol("EMAIL_SENDER");

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** Alternativa em texto puro (deliverability). Opcional. */
  text?: string;
}

/** Porta de envio de e-mail (implementada por ResendEmailSender). */
export interface IEmailSender {
  /**
   * Envia um e-mail.
   * - Canal desabilitado (sem flag/chave) → no-op, retorna `false` (não lança).
   * - Envio bem-sucedido → retorna `true`.
   * - Falha real de envio (canal habilitado) → **lança**. Cabe ao caller decidir
   *   se a falha é crítica (aborta o fluxo) ou best-effort (try/catch + log).
   */
  send(input: SendEmailInput): Promise<boolean>;
}
