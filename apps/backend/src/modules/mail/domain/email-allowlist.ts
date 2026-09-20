const SEPARATOR_PATTERN = /[,;\s]+/;

/**
 * Extrai a lista de e-mails permitidos de `EMAIL_ALLOWLIST` (env var crua).
 * Aceita vírgula, ponto-e-vírgula ou espaço como separador; normaliza cada
 * entrada (trim + lowercase) e descarta entradas vazias.
 */
export function parseEmailAllowlist(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(SEPARATOR_PATTERN)
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

/**
 * Igualdade exata case-insensitive contra a allowlist (sem wildcard de
 * domínio). Lista vazia nunca permite ninguém — é o comportamento fail-safe
 * exigido quando o enforcing está ativo sem nenhum destinatário configurado.
 */
export function isRecipientAllowed(
  email: string,
  allowlist: string[],
): boolean {
  const normalized = email.trim().toLowerCase();
  return allowlist.includes(normalized);
}
