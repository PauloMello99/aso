// Único ponto que serializa querystring de endpoints /options — mantém a
// ordem de inserção das chaves para que a query key derivada seja estável.

// Espelha MAX_OPTIONS dos use-cases de backend (list-*-options). Mantido só
// como default de exibição no AsyncCombobox — se o backend mudar o limite,
// ajuste aqui (não há um endpoint que exponha isso em runtime).
export const DEFAULT_OPTIONS_TRUNCATION_LIMIT = 1000

// Descarta chaves com valor undefined/"" — usado tanto para montar a
// querystring quanto para derivar a query key, garantindo que as duas tenham
// exatamente a mesma cardinalidade (ver query-keys.ts) e não dupliquem cache
// entre "sem filtro" e "filtro vazio".
export function normalizeOptionsParams<T extends object>(params: T): Partial<T> {
  const normalized: Partial<T> = {}
  for (const key of Object.keys(params) as (keyof T)[]) {
    const value = params[key] as unknown
    if (value === undefined || value === "") continue
    normalized[key] = value as T[keyof T]
  }
  return normalized
}

export function buildOptionsQuery(
  params: Record<string, string | undefined>,
): string {
  const normalized = normalizeOptionsParams(params)
  const parts = Object.entries(normalized).map(
    ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`,
  )
  return parts.length === 0 ? "" : `?${parts.join("&")}`
}
