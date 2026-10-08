/**
 * Erro de persistencia SANITIZADO. Erros do drizzle (DrizzleQueryError) trazem
 * `Failed query: <sql> params: <params>` na message e o erro do driver em
 * `cause` — com nome/e-mail/telefone/ideia do solicitante, slug e nome publico.
 * Na fronteira do repositorio relancamos este erro, sem cause/sql/params e com
 * message fixa; so o SQLSTATE sobrevive para diagnostico.
 */
export class QuoteRequestPersistenceError extends Error {
  readonly sqlState: string | undefined;

  constructor(sqlState?: string) {
    super("Falha ao gravar pedido de orcamento");
    this.name = "QuoteRequestPersistenceError";
    this.sqlState = sqlState;
  }
}

const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/;

/** Procura um SQLSTATE em `error.code` ou na cadeia de `cause`. */
export function findSqlState(error: unknown, depth = 0): string | undefined {
  if (typeof error !== "object" || error === null || depth > 5) {
    return undefined;
  }
  const candidate = error as { code?: unknown; cause?: unknown };
  if (
    typeof candidate.code === "string" &&
    SQLSTATE_PATTERN.test(candidate.code)
  ) {
    return candidate.code;
  }
  return findSqlState(candidate.cause, depth + 1);
}

export function toPersistenceError(error: unknown): QuoteRequestPersistenceError {
  return new QuoteRequestPersistenceError(findSqlState(error));
}
