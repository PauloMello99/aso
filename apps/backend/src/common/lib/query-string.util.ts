const DEFAULT_MAX_LENGTH = 100;

/**
 * Truncates a raw `@Query()` free-text param (e.g. `q`) to a safe maximum
 * length before it reaches a use-case/repository `ilike` search, so a
 * client can't force an arbitrarily long pattern. Returns `undefined` for
 * empty/whitespace-only input, mirroring how these params are already
 * treated as "not provided".
 */
export function sanitizeSearchQuery(
  value: string | undefined,
  maxLength: number = DEFAULT_MAX_LENGTH,
): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}
