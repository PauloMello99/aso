import type { PaymentFee, PaymentMethod } from "../types"
import { FEE_ELIGIBLE_METHODS } from "../types"

export interface NetPreview {
  feeCents: number
  netCents: number
  hasFee: boolean
}

export function previewNet(
  grossCents: number,
  method: PaymentMethod,
  type: "income" | "outcome",
  fees: PaymentFee[],
  installments = 1,
): NetPreview {
  // Taxa agora varia por (método, parcelas) — GET /cashier/fees pode devolver
  // uma linha por faixa de crédito. Sem casar installments, `find` pegaria a
  // primeira faixa de qualquer jeito (dinheiro errado na prévia).
  const fee = fees.find(
    (f) => f.paymentMethod === method && f.installments === installments,
  )
  const eligible =
    type === "income" && FEE_ELIGIBLE_METHODS.includes(method) && !!fee

  if (!eligible || !fee) {
    return { feeCents: 0, netCents: grossCents, hasFee: false }
  }

  const percent = Number.parseFloat(fee.percent) || 0
  const rawFee = Math.round((grossCents * percent) / 100) + (fee.fixedCents || 0)
  const feeCents = Math.max(0, Math.min(rawFee, grossCents))
  return { feeCents, netCents: grossCents - feeCents, hasFee: feeCents > 0 }
}
