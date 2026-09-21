export const HIDDEN_AXIS_TICK = "•••"

const compactNumber = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
})

/**
 * Rótulo compacto para eixo de valor (centavos -> "150 mil", "1,5 mi"). Com
 * "Ocultar valores" ligado devolve um marcador fixo, sem nenhum dígito.
 */
export function formatAxisMoney(cents: number, hidden: boolean): string {
  if (hidden) return HIDDEN_AXIS_TICK
  return compactNumber.format(cents / 100)
}

const SERIES_LABELS: Record<string, string> = {
  totalCents: "Saldo",
  incomeCents: "Entradas",
  expenseCents: "Saídas",
  revenueCents: "Receita",
  commissionCents: "Comissão",
  netCents: "Líquido",
}

/**
 * Nome legível de uma série no tooltip: a chave crua do dado (ex.:
 * "totalCents") vira rótulo pt-BR; nomes já legíveis passam intactos.
 */
export function seriesLabel(name: string | undefined): string {
  if (!name) return ""
  return SERIES_LABELS[name] ?? name
}

/** Trunca rótulo de categoria longo para caber no eixo, com reticências. */
export function truncateTick(label: string, max = 12): string {
  if (label.length <= max) return label
  return `${label.slice(0, Math.max(1, max - 1))}…`
}
