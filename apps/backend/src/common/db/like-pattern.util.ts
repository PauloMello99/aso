/**
 * Helpers for building `ilike`/`like` patterns from user-supplied search
 * terms. Shared by repositories that expose free-text search (materials,
 * customers, ...) so `%`/`_` typed by the user don't act as SQL wildcards.
 */

/**
 * Escapes `\`, `%` and `_` in a raw search term so it can be safely wrapped
 * in a `%...%` pattern for `ilike`/`like` without the user's own input being
 * interpreted as wildcards. Drizzle already parametrizes the value (no SQL
 * injection risk); this is purely about matching predictability.
 */
export function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Builds a `%escaped%` "contains" pattern from a raw user search term.
 */
export function containsPattern(term: string): string {
  return `%${escapeLikePattern(term)}%`;
}
