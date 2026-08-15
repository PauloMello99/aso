import { describe, expect, it } from "vitest"
import { createPublicTicketSchema } from "./public-ticket.schema"

function buildInput(overrides: Partial<Record<string, string>> = {}) {
  return {
    requesterName: "Maria Silva",
    requesterEmail: "maria@example.com",
    subject: "Assunto válido",
    description: "Descrição com mais de dez caracteres",
    categorySystemKey: "billing",
    turnstileToken: "token-valido",
    ...overrides,
  }
}

describe("createPublicTicketSchema", () => {
  it("aceita payload válido", () => {
    expect(createPublicTicketSchema.safeParse(buildInput()).success).toBe(true)
  })

  it("rejeita requesterName com menos de 2 caracteres", () => {
    expect(
      createPublicTicketSchema.safeParse(buildInput({ requesterName: "a" }))
        .success,
    ).toBe(false)
  })

  it("aceita requesterName no limite mínimo (2 caracteres)", () => {
    expect(
      createPublicTicketSchema.safeParse(buildInput({ requesterName: "ab" }))
        .success,
    ).toBe(true)
  })

  it("rejeita requesterName com mais de 120 caracteres", () => {
    expect(
      createPublicTicketSchema.safeParse(
        buildInput({ requesterName: "a".repeat(121) }),
      ).success,
    ).toBe(false)
  })

  it("aceita requesterName no limite máximo (120 caracteres)", () => {
    expect(
      createPublicTicketSchema.safeParse(
        buildInput({ requesterName: "a".repeat(120) }),
      ).success,
    ).toBe(true)
  })

  it("rejeita requesterEmail inválido", () => {
    expect(
      createPublicTicketSchema.safeParse(
        buildInput({ requesterEmail: "nao-e-email" }),
      ).success,
    ).toBe(false)
  })

  it("rejeita subject com menos de 5 caracteres", () => {
    expect(
      createPublicTicketSchema.safeParse(buildInput({ subject: "abcd" }))
        .success,
    ).toBe(false)
  })

  it("aceita subject no limite máximo (200 caracteres)", () => {
    expect(
      createPublicTicketSchema.safeParse(
        buildInput({ subject: "a".repeat(200) }),
      ).success,
    ).toBe(true)
  })

  it("rejeita description com menos de 10 caracteres", () => {
    expect(
      createPublicTicketSchema.safeParse(buildInput({ description: "curta" }))
        .success,
    ).toBe(false)
  })

  it("aceita description no limite máximo (5000 caracteres)", () => {
    expect(
      createPublicTicketSchema.safeParse(
        buildInput({ description: "a".repeat(5000) }),
      ).success,
    ).toBe(true)
  })

  it("rejeita categorySystemKey vazio", () => {
    expect(
      createPublicTicketSchema.safeParse(buildInput({ categorySystemKey: "" }))
        .success,
    ).toBe(false)
  })

  it("rejeita turnstileToken vazio", () => {
    expect(
      createPublicTicketSchema.safeParse(buildInput({ turnstileToken: "" }))
        .success,
    ).toBe(false)
  })
})
