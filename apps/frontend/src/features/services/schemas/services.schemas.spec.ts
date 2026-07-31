import { describe, expect, it } from "vitest"
import { createServiceSchema } from "./services.schemas"

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
