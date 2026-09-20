import { describe, expect, it } from "vitest"
import { correctServicePaymentSchema, createServiceSchema } from "./services.schemas"

function buildInput(materials: unknown, serviceTypeId = "type-1") {
  return {
    customerId: "customer-1",
    serviceTypeId,
    performedBy: "",
    description: "",
    amount: "150,00",
    paymentMethod: "cash",
    paymentStatus: "paid",
    performedAt: "",
    materials,
  }
}

function buildPaymentInput(
  overrides: Partial<{
    paymentMethod: "cash" | "bank_transfer" | "credit_card" | "debit_card"
    installments: number | undefined
  }> = {},
) {
  return {
    customerId: "customer-1",
    serviceTypeId: "type-1",
    performedBy: "",
    description: "",
    amount: "150,00",
    paymentMethod: "credit_card" as const,
    paymentStatus: "paid" as const,
    performedAt: "",
    materials: [
      { materialId: "m1", shareable: false, quantity: "1", finished: false },
    ],
    ...overrides,
  }
}

function materialsErrors(materials: unknown) {
  const result = createServiceSchema.safeParse(buildInput(materials))
  if (result.success) return []
  return result.error.issues.filter((i) => i.path[0] === "materials")
}

function serviceTypeErrors(serviceTypeId: string, materials: unknown = []) {
  const result = createServiceSchema.safeParse(buildInput(materials, serviceTypeId))
  if (result.success) return []
  return result.error.issues.filter((i) => i.path[0] === "serviceTypeId")
}

describe("createServiceSchema materials consumption", () => {
  it("rejeita lista vazia", () => {
    expect(materialsErrors([]).length).toBeGreaterThan(0)
  })

  it("rejeita material compartilhável adicionado sem marcar 'Acabou?'", () => {
    const errors = materialsErrors([
      { materialId: "m1", shareable: true, quantity: "", finished: false },
    ])
    expect(errors.length).toBeGreaterThan(0)
  })

  it("aceita material compartilhável com 'Acabou?' marcado", () => {
    const errors = materialsErrors([
      { materialId: "m1", shareable: true, quantity: "", finished: true },
    ])
    expect(errors).toHaveLength(0)
  })

  it("rejeita material não-compartilhável com quantidade vazia", () => {
    const errors = materialsErrors([
      { materialId: "m1", shareable: false, quantity: "", finished: false },
    ])
    expect(errors.length).toBeGreaterThan(0)
  })

  it("rejeita material não-compartilhável com quantidade zero", () => {
    const errors = materialsErrors([
      { materialId: "m1", shareable: false, quantity: "0", finished: false },
    ])
    expect(errors.length).toBeGreaterThan(0)
  })

  it("aceita material não-compartilhável com quantidade > 0", () => {
    const errors = materialsErrors([
      { materialId: "m1", shareable: false, quantity: "2", finished: false },
    ])
    expect(errors).toHaveLength(0)
  })

  it("aceita quando ao menos uma linha entre várias tem consumo real", () => {
    const errors = materialsErrors([
      { materialId: "m1", shareable: true, quantity: "", finished: false },
      { materialId: "m2", shareable: false, quantity: "1", finished: false },
    ])
    expect(errors).toHaveLength(0)
  })

  it("rejeita quantidade decimal com ponto", () => {
    const errors = materialsErrors([
      { materialId: "m1", shareable: false, quantity: "1.5", finished: false },
    ])
    expect(errors.length).toBeGreaterThan(0)
  })

  it("rejeita quantidade decimal com vírgula", () => {
    const errors = materialsErrors([
      { materialId: "m1", shareable: false, quantity: "1,5", finished: false },
    ])
    expect(errors.length).toBeGreaterThan(0)
  })

  it("aceita quantidade inteira", () => {
    const errors = materialsErrors([
      { materialId: "m1", shareable: false, quantity: "2", finished: false },
    ])
    expect(errors).toHaveLength(0)
  })

  it("aceita quantidade vazia em material compartilhável (sem regressão)", () => {
    const errors = materialsErrors([
      { materialId: "m1", shareable: true, quantity: "", finished: true },
    ])
    expect(errors).toHaveLength(0)
  })
})

describe("createServiceSchema serviceTypeId", () => {
  it("rejeita serviceTypeId vazio", () => {
    expect(serviceTypeErrors("").length).toBeGreaterThan(0)
  })

  it("aceita serviceTypeId preenchido", () => {
    expect(serviceTypeErrors("type-1")).toHaveLength(0)
  })
})

function paymentInstallmentsErrors(
  overrides: Partial<{
    paymentMethod: "cash" | "bank_transfer" | "credit_card" | "debit_card"
    installments: number | undefined
  }> = {},
) {
  const result = createServiceSchema.safeParse(buildPaymentInput(overrides))
  if (result.success) return []
  return result.error.issues.filter((i) => i.path[0] === "installments")
}

describe("createServiceSchema installments", () => {
  it("aceita sem installments (à vista implícito)", () => {
    expect(
      createServiceSchema.safeParse(buildPaymentInput({ installments: undefined }))
        .success,
    ).toBe(true)
  })

  it("aceita installments 6 com paymentMethod credit_card", () => {
    expect(
      createServiceSchema.safeParse(
        buildPaymentInput({ paymentMethod: "credit_card", installments: 6 }),
      ).success,
    ).toBe(true)
  })

  it("rejeita installments 6 com paymentMethod cash (não parcelável)", () => {
    expect(
      paymentInstallmentsErrors({ paymentMethod: "cash", installments: 6 }).length,
    ).toBeGreaterThan(0)
  })

  it("rejeita installments acima do teto MAX_INSTALLMENTS (13)", () => {
    expect(
      paymentInstallmentsErrors({
        paymentMethod: "credit_card",
        installments: 13,
      }).length,
    ).toBeGreaterThan(0)
  })
})

describe("correctServicePaymentSchema installments", () => {
  function buildCorrectionInput(
    overrides: Partial<{
      paymentMethod: "cash" | "bank_transfer" | "credit_card" | "debit_card"
      installments: number | undefined
    }> = {},
  ) {
    return {
      amount: "150,00",
      paymentMethod: "credit_card" as const,
      description: "",
      transactedAt: "",
      ...overrides,
    }
  }

  it("aceita sem installments (à vista implícito)", () => {
    expect(
      correctServicePaymentSchema.safeParse(
        buildCorrectionInput({ installments: undefined }),
      ).success,
    ).toBe(true)
  })

  it("aceita installments 6 com paymentMethod credit_card", () => {
    expect(
      correctServicePaymentSchema.safeParse(
        buildCorrectionInput({ paymentMethod: "credit_card", installments: 6 }),
      ).success,
    ).toBe(true)
  })

  it("rejeita installments 6 com paymentMethod cash (não parcelável)", () => {
    const result = correctServicePaymentSchema.safeParse(
      buildCorrectionInput({ paymentMethod: "cash", installments: 6 }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path[0] === "installments"),
      ).toBe(true)
    }
  })
})
