import { describe, expect, it } from "vitest"
import {
  commissionItemSchema,
  feeItemSchema,
  memberFeeItemSchema,
  transactionSchema,
} from "./cashier.schemas"

function buildInput(percent: string) {
  return { userId: "user-1", percent, mode: "gross" as const }
}

function buildOrgFeeInput(
  overrides: Partial<{
    percent: string
    fixed: string
    paymentMethod: "cash" | "bank_transfer" | "credit_card" | "debit_card"
    installments: number
  }> = {},
) {
  return {
    paymentMethod: "credit_card" as const,
    percent: "2.5",
    fixed: "0,50",
    installments: 1,
    ...overrides,
  }
}

function buildFeeInput(
  overrides: Partial<{
    percent: string
    fixedCents: number
    paymentMethod: "credit_card" | "debit_card"
    installments: number
  }> = {},
) {
  return {
    userId: "user-1",
    paymentMethod: "credit_card" as const,
    percent: "2.5",
    fixedCents: 50,
    installments: 1,
    ...overrides,
  }
}

function buildTransactionInput(
  overrides: Partial<{
    paymentMethod: "cash" | "bank_transfer" | "credit_card" | "debit_card"
    installments: number | undefined
  }> = {},
) {
  return {
    description: "Tatuagem braço",
    type: "income" as const,
    amount: "150,00",
    paymentMethod: "credit_card" as const,
    categoryId: "",
    createdBy: "",
    transactedAt: "",
    ...overrides,
  }
}

function transactionInstallmentsErrors(
  overrides: Partial<{
    paymentMethod: "cash" | "bank_transfer" | "credit_card" | "debit_card"
    installments: number | undefined
  }> = {},
) {
  const result = transactionSchema.safeParse(buildTransactionInput(overrides))
  if (result.success) return []
  return result.error.issues.filter((i) => i.path[0] === "installments")
}

describe("transactionSchema installments", () => {
  it("aceita sem installments (à vista implícito)", () => {
    expect(
      transactionSchema.safeParse(buildTransactionInput({ installments: undefined }))
        .success,
    ).toBe(true)
  })

  it("aceita installments 6 com paymentMethod credit_card", () => {
    expect(
      transactionSchema.safeParse(
        buildTransactionInput({ paymentMethod: "credit_card", installments: 6 }),
      ).success,
    ).toBe(true)
  })

  it("rejeita installments 6 com paymentMethod cash (não parcelável)", () => {
    expect(
      transactionInstallmentsErrors({ paymentMethod: "cash", installments: 6 })
        .length,
    ).toBeGreaterThan(0)
  })

  it("rejeita installments acima do teto MAX_INSTALLMENTS (13)", () => {
    expect(
      transactionInstallmentsErrors({
        paymentMethod: "credit_card",
        installments: 13,
      }).length,
    ).toBeGreaterThan(0)
  })
})

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

describe("feeItemSchema", () => {
  it("aceita installments 1 em qualquer método", () => {
    for (const paymentMethod of [
      "cash",
      "bank_transfer",
      "credit_card",
      "debit_card",
    ] as const) {
      expect(
        feeItemSchema.safeParse(buildOrgFeeInput({ paymentMethod })).success,
      ).toBe(true)
    }
  })

  it("aceita installments 6 com paymentMethod credit_card", () => {
    expect(
      feeItemSchema.safeParse(
        buildOrgFeeInput({ paymentMethod: "credit_card", installments: 6 }),
      ).success,
    ).toBe(true)
  })

  it("rejeita installments 6 com paymentMethod cash (não parcelável)", () => {
    expect(
      feeItemSchema.safeParse(
        buildOrgFeeInput({ paymentMethod: "cash", installments: 6 }),
      ).success,
    ).toBe(false)
  })

  it("rejeita installments 0", () => {
    expect(
      feeItemSchema.safeParse(buildOrgFeeInput({ installments: 0 })).success,
    ).toBe(false)
  })

  it("rejeita installments acima do teto MAX_INSTALLMENTS (13)", () => {
    expect(
      feeItemSchema.safeParse(buildOrgFeeInput({ installments: 13 })).success,
    ).toBe(false)
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

  it("aceita installments 1 em débito (à vista é o único plano de débito)", () => {
    expect(
      memberFeeItemSchema.safeParse(
        buildFeeInput({ paymentMethod: "debit_card", installments: 1 }),
      ).success,
    ).toBe(true)
  })

  it("aceita installments 6 em crédito", () => {
    expect(
      memberFeeItemSchema.safeParse(
        buildFeeInput({ paymentMethod: "credit_card", installments: 6 }),
      ).success,
    ).toBe(true)
  })

  it("rejeita installments 6 em débito (parcelamento só existe em crédito)", () => {
    expect(
      memberFeeItemSchema.safeParse(
        buildFeeInput({ paymentMethod: "debit_card", installments: 6 }),
      ).success,
    ).toBe(false)
  })

  it("rejeita installments 0", () => {
    expect(
      memberFeeItemSchema.safeParse(buildFeeInput({ installments: 0 })).success,
    ).toBe(false)
  })

  it("rejeita installments acima do teto MAX_INSTALLMENTS (13)", () => {
    expect(
      memberFeeItemSchema.safeParse(buildFeeInput({ installments: 13 }))
        .success,
    ).toBe(false)
  })
})
