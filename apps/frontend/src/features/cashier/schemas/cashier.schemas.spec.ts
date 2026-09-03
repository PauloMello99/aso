import { describe, expect, it } from "vitest"
import { commissionItemSchema, memberFeeItemSchema } from "./cashier.schemas"

function buildInput(percent: string) {
  return { userId: "user-1", percent, mode: "gross" as const }
}

function buildFeeInput(
  overrides: Partial<{ percent: string; fixedCents: number }> = {},
) {
  return {
    userId: "user-1",
    paymentMethod: "credit_card" as const,
    percent: "2.5",
    fixedCents: 50,
    ...overrides,
  }
}

describe("commissionItemSchema percent", () => {
  it("aceita vazio (normalizado para '0' no submit pelo componente)", () => {
    const result = commissionItemSchema.safeParse(buildInput(""))
    expect(result.success).toBe(true)
  })

  it("aceita '100'", () => {
    expect(commissionItemSchema.safeParse(buildInput("100")).success).toBe(true)
  })

  it("rejeita '100.01'", () => {
    expect(commissionItemSchema.safeParse(buildInput("100.01")).success).toBe(
      false,
    )
  })

  it("rejeita '-1'", () => {
    expect(commissionItemSchema.safeParse(buildInput("-1")).success).toBe(false)
  })

  it("aceita vírgula decimal ('33,33')", () => {
    expect(commissionItemSchema.safeParse(buildInput("33,33")).success).toBe(
      true,
    )
  })
})

describe("memberFeeItemSchema", () => {
  it("aceita percent vazio e fixedCents 0", () => {
    expect(
      memberFeeItemSchema.safeParse(buildFeeInput({ percent: "", fixedCents: 0 }))
        .success,
    ).toBe(true)
  })

  it("rejeita percent acima de 100", () => {
    expect(
      memberFeeItemSchema.safeParse(buildFeeInput({ percent: "100.01" })).success,
    ).toBe(false)
  })

  it("rejeita fixedCents negativo", () => {
    expect(
      memberFeeItemSchema.safeParse(buildFeeInput({ fixedCents: -1 })).success,
    ).toBe(false)
  })

  it("rejeita fixedCents não inteiro", () => {
    expect(
      memberFeeItemSchema.safeParse(buildFeeInput({ fixedCents: 12.5 })).success,
    ).toBe(false)
  })

  it("rejeita paymentMethod não elegível (cash)", () => {
    expect(
      memberFeeItemSchema.safeParse({
        ...buildFeeInput(),
        paymentMethod: "cash",
      }).success,
    ).toBe(false)
  })
})
