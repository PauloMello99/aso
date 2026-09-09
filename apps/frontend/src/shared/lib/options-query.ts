// Único ponto que serializa querystring de endpoints /options — mantém a
// ordem de inserção das chaves para que a query key derivada seja estável.
export function buildOptionsQuery(
  params: Record<string, string | undefined>,
): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  }
  return parts.length === 0 ? "" : `?${parts.join("&")}`
}
