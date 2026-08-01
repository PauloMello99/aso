export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

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

export function centsToReaisInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",")
}
