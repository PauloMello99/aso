import { describe, expect, it } from "vitest"
import { formatPaymentMethod } from "./payment-method-label"

describe("formatPaymentMethod", () => {
  it("mostra a faixa de parcelas para crédito com installments > 1", () => {
    expect(formatPaymentMethod("credit_card", 6)).toBe("Cartão de crédito · 6x")
  })

  it("não mostra faixa redundante para crédito à vista (installments = 1)", () => {
    expect(formatPaymentMethod("credit_card", 1)).toBe("Cartão de crédito")
  })

  it("não mostra faixa para crédito sem installments (null)", () => {
    expect(formatPaymentMethod("credit_card", null)).toBe("Cartão de crédito")
  })

  it("não mostra faixa para método diferente de crédito, mesmo com installments > 1", () => {
    expect(formatPaymentMethod("debit_card", 6)).toBe("Cartão de débito")
  })
})
