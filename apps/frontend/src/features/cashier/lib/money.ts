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
 * Converte uma string em reais para centavos. Aceita os formatos validados pelo
 * schema zod `moneyString`: agrupamento de milhar por ponto ("1.234" = 1234,00)
 * e separador decimal por ponto OU vírgula com 1-2 dígitos ("1234.56"/"1234,56").
 * O último separador só é tratado como decimal se for seguido de 1-2 dígitos —
 * senão é agrupamento de milhar (ex.: "1.234" ≠ "1,234.00", ver domain-rules).
 * Retorna NaN se inválida — o schema zod valida antes de chegar aqui.
 */
export function parseReaisToCents(input: string): number {
  const trimmed = input.trim().replace(/\s/g, "")
  if (!trimmed) return Number.NaN

  const lastSepIndex = Math.max(
    trimmed.lastIndexOf("."),
    trimmed.lastIndexOf(","),
  )

  let integerPart: string
  let fractionPart = ""

  if (lastSepIndex === -1) {
    integerPart = trimmed
  } else {
    const fraction = trimmed.slice(lastSepIndex + 1)
    if (fraction.length >= 1 && fraction.length <= 2) {
      integerPart = trimmed.slice(0, lastSepIndex).replace(/[.,]/g, "")
      fractionPart = fraction
    } else {
      integerPart = trimmed.replace(/[.,]/g, "")
    }
  }

  if (!/^\d+$/.test(integerPart) || !/^\d*$/.test(fractionPart)) {
    return Number.NaN
  }

  const centsFraction = fractionPart.padEnd(2, "0").slice(0, 2)
  return Number.parseInt(integerPart, 10) * 100 + Number.parseInt(centsFraction, 10)
}

/** Converte centavos para string editável em reais com vírgula decimal: 123456 → "1234,56". */
export function centsToReaisInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",")
}
