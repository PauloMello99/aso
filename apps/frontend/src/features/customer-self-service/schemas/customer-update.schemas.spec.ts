import { describe, expect, it } from "vitest"
import { customerUpdateSchema } from "./customer-update.schemas"

const VALID_VALUES = {
  name: "Maria Silva",
  email: "maria@example.com",
  phone: "+5511999999999",
  gender: "",
  birthDate: "1990-01-01",
  address: "Rua A",
  addressLine2: "",
  number: "123",
  city: "São Paulo",
  state: "SP",
  postalCode: "01310-100",
  country: "BR",
}

describe("customerUpdateSchema", () => {
  it("aceita o payload válido completo", () => {
    const result = customerUpdateSchema.safeParse(VALID_VALUES)
    expect(result.success).toBe(true)
  })

  it("rejeita name em branco", () => {
    const result = customerUpdateSchema.safeParse({
      ...VALID_VALUES,
      name: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita email inválido", () => {
    const result = customerUpdateSchema.safeParse({
      ...VALID_VALUES,
      email: "não-é-email",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita email em branco (obrigatório)", () => {
    const result = customerUpdateSchema.safeParse({
      ...VALID_VALUES,
      email: "",
    })
    expect(result.success).toBe(false)
  })

  it("aceita phone vazio (opcional apesar de string simples)", () => {
    const result = customerUpdateSchema.safeParse({
      ...VALID_VALUES,
      phone: "",
    })
    expect(result.success).toBe(true)
  })

  it("rejeita phone inválido quando preenchido", () => {
    const result = customerUpdateSchema.safeParse({
      ...VALID_VALUES,
      phone: "123",
    })
    expect(result.success).toBe(false)
  })

  it("aceita gender vazio", () => {
    const result = customerUpdateSchema.safeParse({
      ...VALID_VALUES,
      gender: "",
    })
    expect(result.success).toBe(true)
  })

  it("rejeita gender com valor fora do enum", () => {
    const result = customerUpdateSchema.safeParse({
      ...VALID_VALUES,
      gender: "invalido",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita birthDate em branco", () => {
    const result = customerUpdateSchema.safeParse({
      ...VALID_VALUES,
      birthDate: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita birthDate com formato inválido", () => {
    const result = customerUpdateSchema.safeParse({
      ...VALID_VALUES,
      birthDate: "01/01/1990",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita address em branco", () => {
    const result = customerUpdateSchema.safeParse({
      ...VALID_VALUES,
      address: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita number em branco", () => {
    const result = customerUpdateSchema.safeParse({
      ...VALID_VALUES,
      number: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita city em branco", () => {
    const result = customerUpdateSchema.safeParse({
      ...VALID_VALUES,
      city: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita state em branco", () => {
    const result = customerUpdateSchema.safeParse({
      ...VALID_VALUES,
      state: "",
    })
    expect(result.success).toBe(false)
  })

  it("aceita addressLine2, postalCode e country vazios", () => {
    const result = customerUpdateSchema.safeParse({
      ...VALID_VALUES,
      addressLine2: "",
      postalCode: "",
      country: "",
    })
    expect(result.success).toBe(true)
  })

  it("rejeita country com mais de 2 caracteres", () => {
    const result = customerUpdateSchema.safeParse({
      ...VALID_VALUES,
      country: "BRA",
    })
    expect(result.success).toBe(false)
  })
})
