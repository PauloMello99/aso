"use client"

import { formatBRL } from "@/features/cashier/lib/money"
import { maskAmount } from "@/shared/lib/hide-values"
import { useHideValues } from "@/shared/components/hide-values-provider"

/**
 * Formata centavos em BRL respeitando o toggle "Ocultar valores" (Caixa e
 * Overview). Nunca altera o valor em centavos — só mascara a string final.
 */
export function useMoneyFormatter(): (cents: number) => string {
  const { hidden } = useHideValues()
  return (cents: number) => {
    const formatted = formatBRL(cents)
    return hidden ? maskAmount(formatted) : formatted
  }
}
