import { describe, expect, it } from "vitest"
import { customerSchema } from "./client.schemas"

function buildInput(phone: string | undefined) {
  return {
    name: "Cliente Teste",
    email: "cliente@teste.com",
    phone,
    birthDate: "1990-01-01",
    address: "Rua Teste",
    number: "123",
    city: "São Paulo",
    state: "SP",
  }
}

function phoneErrors(phone: string | undefined) {
  const result = customerSchema.safeParse(buildInput(phone))
  if (result.success) return []
  return result.error.issues.filter((i) => i.path[0] === "phone")
}

describe("customerSchema phone validation (telefones brasileiros)", () => {
  it("aceita celular BR com 9º dígito (E.164)", () => {
    expect(phoneErrors("+5511987654321")).toHaveLength(0)
  })

  it("aceita celular BR de outro DDD (86 - Piauí)", () => {
    expect(phoneErrors("+5586987654321")).toHaveLength(0)
  })

  it("aceita fixo BR (8 dígitos + DDD)", () => {
    expect(phoneErrors("+551133334444")).toHaveLength(0)
  })

  it("rejeita celular BR sem o 9º dígito (formato antigo, inválido desde a migração da ANATEL)", () => {
    expect(phoneErrors("+551187654321").length).toBeGreaterThan(0)
  })

  it("rejeita telefone sem código de país", () => {
    expect(phoneErrors("11987654321").length).toBeGreaterThan(0)
  })

  it("rejeita número com dígitos insuficientes", () => {
    expect(phoneErrors("+55119876543").length).toBeGreaterThan(0)
  })

  it("rejeita valor não numérico", () => {
    expect(phoneErrors("abc").length).toBeGreaterThan(0)
  })

  it("rejeita código de país sem número real associado", () => {
    expect(phoneErrors("+1234567").length).toBeGreaterThan(0)
  })

  it("aceita phone undefined (campo opcional)", () => {
    expect(phoneErrors(undefined)).toHaveLength(0)
  })

  it("aceita phone em branco (campo opcional)", () => {
    expect(phoneErrors("")).toHaveLength(0)
  })
})
