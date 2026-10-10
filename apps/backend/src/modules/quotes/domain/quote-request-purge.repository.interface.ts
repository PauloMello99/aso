import type {
  QuotePurgeScope,
  QuoteRequestOutcome,
} from "./quote-request-lifecycle";

export const QUOTE_REQUEST_PURGE_REPOSITORY = Symbol(
  "QUOTE_REQUEST_PURGE_REPOSITORY",
);

export type QuoteRequestPurgeClaim = {
  id: string;
  orgId: string;
  scope: QuotePurgeScope;
  /** Tentativas ja contadas, INCLUINDO a deste claim. */
  attempts: number;
  /** purge_last_attempt_at gravado no claim: lease + chave de CAS na conclusao. */
  claimedAt: Date;
};

export type CloseQuoteRequestInput = {
  orgId: string;
  id: string;
  /** Vem do detalhe ja autorizado pela sessao; nunca do cliente. */
  targetUserId: string;
  outcome: QuoteRequestOutcome;
  now: Date;
  /** Obrigatorio quando outcome = 'scheduled': prova de que o evento foi commitado. */
  requiredEventId?: string;
};

/**
 * Fila de purga de pedidos de orcamento. Tudo via DRIZZLE_ADMIN (cron, sem sessao;
 * RLS negaria) e escopado por org_id. Erros de banco sobem sanitizados (sem PII).
 */
export interface IQuoteRequestPurgeRepository {
  /**
   * Reivindica ate `limit` pedidos pendentes de purga (ou vencidos) num unico
   * statement (FOR UPDATE SKIP LOCKED), incrementando purge_attempts e
   * renovando o lease. Vencidos (expires_at <= now) viram escopo 'all'.
   */
  claimDuePurges(
    now: Date,
    leaseMs: number,
    limit: number,
  ): Promise<QuoteRequestPurgeClaim[]>;

  /**
   * Encerra o pedido (status, closed_at, expires_at, purge_*) em UM statement (os
   * CHECKs da 0091 exigem as colunas juntas) e ja toma o lease como um claim
   * (purge_attempts + 1, purge_last_attempt_at = now), impedindo o cron de
   * reivindicar em paralelo. null = ja respondido/expirado/fora do alvo ou, no
   * 'scheduled', evento nao commitado.
   */
  closeAndClaim(
    input: CloseQuoteRequestInput,
  ): Promise<QuoteRequestPurgeClaim | null>;

  listImagePaths(orgId: string, id: string): Promise<string[]>;

  /** Apaga a linha (imagens por CASCADE) so se purge_scope = 'all'. true se apagou. */
  deleteRequest(orgId: string, id: string): Promise<boolean>;

  /**
   * Escopo 'images': apaga as linhas de imagem e zera a fila (purge_*), em uma
   * transacao, so se o claim ainda for o vigente (CAS por purge_last_attempt_at).
   * false quando o claim foi perdido (nada alterado).
   */
  completeImagePurge(
    orgId: string,
    id: string,
    claimedAt: Date,
  ): Promise<boolean>;

  recordPurgeFailure(orgId: string, id: string, code: string): Promise<void>;

  /**
   * Subconjunto de `ids` que existe em quote_requests da org. Lista vazia =>
   * Set vazio sem consultar. Erro de banco RELANCA (nunca vira "nenhum existe").
   */
  findExistingRequestIds(orgId: string, ids: string[]): Promise<Set<string>>;
}
