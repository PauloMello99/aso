import { describe, expect, it } from "vitest"
import { previewNet } from "./fees"
import type { PaymentFee } from "../types"

function buildFee(overrides: Partial<PaymentFee> = {}): PaymentFee {
  return {
    id: "fee-1",
    orgId: "org-1",
    paymentMethod: "credit_card",
    percent: "2.00",
    fixedCents: 10,
    installments: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("previewNet", () => {
  it("aplica a taxa de 1x por padrão quando installments não é informado", () => {
    const fees = [buildFee({ installments: 1, percent: "2.00", fixedCents: 10 })]
    const result = previewNet(10000, "credit_card", "income", fees)
    expect(result).toEqual({ feeCents: 210, netCents: 9790, hasFee: true })
  })

  it("casa a faixa certa quando há múltiplas taxas de crédito por parcela", () => {
    const fees = [
      buildFee({ installments: 1, percent: "2.00", fixedCents: 10 }),
      buildFee({
        id: "fee-6",
        installments: 6,
        percent: "8.00",
        fixedCents: 20,
      }),
    ]
    const result6x = previewNet(10000, "credit_card", "income", fees, 6)
    expect(result6x).toEqual({ feeCents: 820, netCents: 9180, hasFee: true })

    const result1x = previewNet(10000, "credit_card", "income", fees, 1)
    expect(result1x).toEqual({ feeCents: 210, netCents: 9790, hasFee: true })
  })

  it("sem config para a faixa pedida, cobra taxa zero (nunca cai na faixa de 1x)", () => {
    const fees = [buildFee({ installments: 1, percent: "2.00", fixedCents: 10 })]
    const result = previewNet(10000, "credit_card", "income", fees, 6)
    expect(result).toEqual({ feeCents: 0, netCents: 10000, hasFee: false })
  })

  it("saída (outcome) nunca tem taxa, mesmo com fee configurada", () => {
    const fees = [buildFee({ installments: 1, percent: "2.00", fixedCents: 10 })]
    const result = previewNet(10000, "credit_card", "outcome", fees)
    expect(result).toEqual({ feeCents: 0, netCents: 10000, hasFee: false })
  })
})
