/** Helpers de dinheiro: o estado/representação canônica é sempre em centavos. */

/** Formata centavos como BRL: 123456 → "R$ 1.234,56". */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

/** Formata centavos sem símbolo: 123456 → "1.234,56". */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Converte uma string em reais ("1234.56" ou "1.234,56") para centavos.
 * Retorna NaN se inválida — o schema zod valida antes de chegar aqui.
 */
export function parseReaisToCents(input: string): number {
  const normalized = input
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
  const value = Number.parseFloat(normalized)
  if (Number.isNaN(value)) return Number.NaN
  return Math.round(value * 100)
}

/** Converte centavos para string editável em reais com ponto decimal: 123456 → "1234.56". */
export function centsToReaisInput(cents: number): string {
  return (cents / 100).toFixed(2)
}
