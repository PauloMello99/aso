import { describe, expect, it } from "vitest"
import { toCorrectPaymentBody } from "./correct-payment-body"
import type { CorrectServicePaymentFormValues } from "../schemas/services.schemas"

function values(
  overrides: Partial<CorrectServicePaymentFormValues> = {},
): CorrectServicePaymentFormValues {
  return {
    amount: "150,00",
    paymentMethod: "cash",
    description: "",
    transactedAt: "",
    ...overrides,
  }
}

describe("toCorrectPaymentBody", () => {
  it("converts the amount from reais input to integer cents", () => {
    expect(toCorrectPaymentBody(values({ amount: "150,00" })).grossCents).toBe(
      15000,
    )
  })

  it("passes the payment method through unchanged", () => {
    expect(
      toCorrectPaymentBody(values({ paymentMethod: "credit_card" }))
        .paymentMethod,
    ).toBe("credit_card")
  })

  it("omits description when empty", () => {
    expect(
      toCorrectPaymentBody(values({ description: "" })).description,
    ).toBeUndefined()
  })

  it("keeps a non-empty description", () => {
    expect(
      toCorrectPaymentBody(values({ description: "Ajuste combinado" }))
        .description,
    ).toBe("Ajuste combinado")
  })

  it("omits transactedAt when empty", () => {
    expect(
      toCorrectPaymentBody(values({ transactedAt: "" })).transactedAt,
    ).toBeUndefined()
  })

  it("converts a date-only transactedAt to an ISO timestamp", () => {
    const result = toCorrectPaymentBody(
      values({ transactedAt: "2026-07-15" }),
    ).transactedAt
    expect(result).toBe("2026-07-15T00:00:00.000Z")
  })
})
