/** Formata uma data ISO como "dd mês aaaa" (pt-BR). */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Formata um mês "YYYY-MM" como "mês/aa" (pt-BR) para eixos de gráfico. */
export function fmtMonth(month: string): string {
  const [y, m] = month.split("-")
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(".", "")
}
