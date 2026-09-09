import { describe, expect, it } from "vitest"
import { toCreateBody, toUpdateBody } from "./service-body"
import type { ServiceFormValues } from "../schemas/services.schemas"

function values(overrides: Partial<ServiceFormValues> = {}): ServiceFormValues {
  return {
    customerId: "cust-1",
    serviceTypeId: "type-1",
    performedBy: "",
    description: "",
    amount: "150,00",
    paymentMethod: "cash",
    paymentStatus: "paid",
    performedAt: "",
    materials: [
      {
        materialId: "mat-1",
        shareable: false,
        quantity: "2",
        finished: false,
        // Snapshot só para exibição no formulário — nunca deve chegar à API.
        name: "Agulha 12RL",
        stockQuantity: "50",
      },
    ],
    anamnesisResponseId: undefined,
    ...overrides,
  }
}

describe("toCreateBody", () => {
  it("never sends the material snapshot keys (name, stockQuantity) to the API", () => {
    const body = toCreateBody(values())

    expect(JSON.stringify(body)).not.toMatch(/"name"/)
    expect(JSON.stringify(body)).not.toMatch(/"stockQuantity"/)
    for (const line of body.materials) {
      expect(line).not.toHaveProperty("name")
      expect(line).not.toHaveProperty("stockQuantity")
    }
  })

  it("converts the amount from reais input to integer cents", () => {
    expect(toCreateBody(values({ amount: "150,00" })).amountCents).toBe(15000)
  })

  it("sends only materialId+finished for shareable lines", () => {
    const body = toCreateBody(
      values({
        materials: [
          {
            materialId: "mat-2",
            shareable: true,
            finished: true,
            name: "Tinta preta",
            stockQuantity: "1",
          },
        ],
      }),
    )
    expect(body.materials).toEqual([{ materialId: "mat-2", finished: true }])
  })

  it("sends materialId+quantity (as number) for non-shareable lines", () => {
    const body = toCreateBody(
      values({
        materials: [
          {
            materialId: "mat-3",
            shareable: false,
            quantity: "3",
            name: "Luva",
            stockQuantity: "20",
          },
        ],
      }),
    )
    expect(body.materials).toEqual([{ materialId: "mat-3", quantity: 3 }])
  })

  it("defaults quantity to 0 for a non-shareable line left blank", () => {
    const body = toCreateBody(
      values({
        materials: [
          { materialId: "mat-4", shareable: false, quantity: "" },
        ],
      }),
    )
    expect(body.materials).toEqual([{ materialId: "mat-4", quantity: 0 }])
  })

  it("nulls out optional fields left empty instead of sending empty strings", () => {
    const body = toCreateBody(
      values({ serviceTypeId: "", performedBy: "", description: "" }),
    )
    expect(body.serviceTypeId).toBeNull()
    expect(body.performedBy).toBeNull()
    expect(body.description).toBeNull()
  })

  it("omits performedAt when empty and converts it to ISO when present", () => {
    expect(toCreateBody(values({ performedAt: "" })).performedAt).toBeUndefined()
    expect(toCreateBody(values({ performedAt: "2026-07-15" })).performedAt).toBe(
      "2026-07-15T00:00:00.000Z",
    )
  })
})

describe("toUpdateBody", () => {
  it("never includes a materials field at all (snapshot keys can't leak)", () => {
    const body = toUpdateBody(values())

    expect(body).not.toHaveProperty("materials")
    expect(JSON.stringify(body)).not.toMatch(/"name"/)
    expect(JSON.stringify(body)).not.toMatch(/"stockQuantity"/)
  })

  it("nulls out optional fields left empty instead of sending empty strings", () => {
    const body = toUpdateBody(
      values({ serviceTypeId: "", performedBy: "", description: "" }),
    )
    expect(body.serviceTypeId).toBeNull()
    expect(body.performedBy).toBeNull()
    expect(body.description).toBeNull()
  })

  it("omits performedAt when empty and converts it to ISO when present", () => {
    expect(toUpdateBody(values({ performedAt: "" })).performedAt).toBeUndefined()
    expect(toUpdateBody(values({ performedAt: "2026-07-15" })).performedAt).toBe(
      "2026-07-15T00:00:00.000Z",
    )
  })
})
