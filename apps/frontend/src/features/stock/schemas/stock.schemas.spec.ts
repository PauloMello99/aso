import { describe, expect, it } from "vitest"
import { materialSchema } from "./stock.schemas"

const UUID_A = "3f1a7d2e-9c44-4b1e-8f0a-2d5c6b7e8f90"
const UUID_B = "b7c1e5d3-2a48-4f6c-9e10-7a3b4c5d6e7f"

function parse(overrides: Record<string, unknown> = {}) {
  return materialSchema.safeParse({ name: "Agulha 3RL", ...overrides })
}

describe("materialSchema — serviceTypeIds", () => {
  it("aceita a ausência do campo (material sem vínculo é legítimo)", () => {
    const result = parse()
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.serviceTypeIds).toBeUndefined()
  })

  it("aceita array vazio (remoção de todos os vínculos)", () => {
    const result = parse({ serviceTypeIds: [] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.serviceTypeIds).toEqual([])
  })

  it("aceita uma lista de uuids válidos", () => {
    const result = parse({ serviceTypeIds: [UUID_A, UUID_B] })
    expect(result.success).toBe(true)
    if (result.success)
      expect(result.data.serviceTypeIds).toEqual([UUID_A, UUID_B])
  })

  it("rejeita id que não é uuid", () => {
    expect(parse({ serviceTypeIds: ["nao-e-uuid"] }).success).toBe(false)
  })

  it("rejeita valor que não é array", () => {
    expect(parse({ serviceTypeIds: UUID_A }).success).toBe(false)
  })
})
