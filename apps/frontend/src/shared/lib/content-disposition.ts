// Extrai o nome do arquivo de um header Content-Disposition. Aceita
// `filename*=UTF-8''...` (RFC 5987) e `filename="..."`/`filename=...`. Remove
// separadores de caminho para que o nome nunca escape do diretório de
// download. Devolve `fallback` quando ausente ou inválido.
export function filenameFromContentDisposition(
  header: string | null | undefined,
  fallback: string,
): string {
  if (!header) return fallback

  let name: string | null = null

  const star = /filename\*\s*=\s*(?:[\w-]+)?'[^']*'([^;]+)/i.exec(header)
  if (star?.[1]) {
    try {
      name = decodeURIComponent(star[1].trim())
    } catch {
      name = null
    }
  }

  if (!name) {
    const plain = /filename\s*=\s*(?:"([^"]*)"|([^;]+))/i.exec(header)
    name = (plain?.[1] ?? plain?.[2] ?? "").trim() || null
  }

  if (!name) return fallback
  const clean = name.replace(/[\\/]/g, "_").trim()
  return clean || fallback
}
