const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Formato canônico de UUID (8-4-4-4-12 hex). Usado para validar tags vindas do
 * provedor antes de consultar uma coluna `uuid` — um valor malformado faria o
 * Postgres lançar erro de cast (500) em vez de "não encontrado".
 */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
