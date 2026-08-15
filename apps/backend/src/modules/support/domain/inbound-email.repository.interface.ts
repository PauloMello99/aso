import { TransactionContext } from "./ports/transaction-runner.port";

export const INBOUND_EMAIL_REPOSITORY = Symbol("INBOUND_EMAIL_REPOSITORY");

export interface ClaimInboundEmailInput {
  emailId: string;
  messageId: string | null;
  fromEmail: string;
  toEmail: string;
}

export interface MarkInboundEmailProcessedResult {
  ticketId: string | null;
  responseId: string | null;
  outcome: string;
}

/**
 * Dedupe do webhook de e-mail recebido (`support_inbound_emails`, ver 0045).
 * `tx` é obrigatório nos dois métodos (e não opcional, como nos demais
 * repositórios do módulo) porque este repositório só é chamado de dentro do
 * `HandleInboundEmailUseCase`, sempre na mesma transação do claim — não há
 * caller fora de uma transação.
 */
export interface IInboundEmailRepository {
  /**
   * Tenta reivindicar o `emailId` via INSERT ... ON CONFLICT (email_id) DO
   * NOTHING. Retorna `true` se reivindicado agora (primeira vez visto —
   * processar); `false` se a linha já existia (retry do webhook — abortar
   * sem tocar em mais nada).
   */
  claim(input: ClaimInboundEmailInput, tx: TransactionContext): Promise<boolean>;
  markProcessed(
    emailId: string,
    result: MarkInboundEmailProcessedResult,
    tx: TransactionContext,
  ): Promise<void>;
}
