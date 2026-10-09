export const QUOTE_REQUEST_STATUS = {
  NEW: "new",
  SCHEDULED: "scheduled",
  NOT_SCHEDULED: "not_scheduled",
} as const;

export type QuoteRequestStatus =
  (typeof QUOTE_REQUEST_STATUS)[keyof typeof QUOTE_REQUEST_STATUS];

export const QUOTE_PURGE_SCOPE = {
  ALL: "all",
  IMAGES: "images",
} as const;

export type QuotePurgeScope =
  (typeof QUOTE_PURGE_SCOPE)[keyof typeof QUOTE_PURGE_SCOPE];

/** Lease de um claim de purga: outro tick so reivindica apos esse intervalo. */
export const QUOTE_PURGE_LEASE_MS = 10 * 60_000;
export const QUOTE_PURGE_BATCH_LIMIT = 50;
/** A partir desta tentativa a falha de purga sobe de warn para error. */
export const QUOTE_PURGE_ALERT_ATTEMPTS = 8;

/** Objeto sem par no banco so e removido pelo sweep apos esta idade (evita corrida com submit). */
export const QUOTE_ORPHAN_MIN_AGE_MS = 24 * 60 * 60_000;
export const QUOTE_ORPHAN_SWEEP_INTERVAL_MS = 6 * 60 * 60_000;
export const QUOTE_ORPHAN_SWEEP_MAX_REMOVALS = 1000;
export const QUOTE_ORPHAN_SWEEP_MAX_REQUEST_FOLDERS = 5000;

const PURGE_ERROR_CODE_MAX_LENGTH = 80;
const PURGE_ERROR_CODE_FALLBACK = "UnknownError";

function sanitizeCodePart(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:-]/g, "");
}

/**
 * Codigo curto e seguro (sem PII, sem texto de provider) para `purge_last_error`:
 * `error.name` + `:SQLSTATE` quando houver. Satisfaz ^[A-Za-z0-9_.:-]{1,80}$.
 */
export function toPurgeErrorCode(error: unknown): string {
  let name = PURGE_ERROR_CODE_FALLBACK;
  let sqlState: string | undefined;

  if (error instanceof Error) {
    name = error.name;
    const candidate = (error as { sqlState?: unknown }).sqlState;
    if (typeof candidate === "string") sqlState = candidate;
  }

  const safeName = sanitizeCodePart(name) || PURGE_ERROR_CODE_FALLBACK;
  const safeState = sqlState ? sanitizeCodePart(sqlState) : "";
  const code = safeState ? `${safeName}:${safeState}` : safeName;
  return code.slice(0, PURGE_ERROR_CODE_MAX_LENGTH);
}
