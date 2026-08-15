import { describe, expect, it } from "vitest"
import { addResponseSchema, createTicketSchema } from "./ticket.schema"

function buildTicketInput(overrides: Partial<Record<string, string>> = {}) {
  return {
    categorySystemKey: "billing",
    subject: "Assunto válido",
    description: "Descrição com mais de dez caracteres",
    ...overrides,
  }
}

describe("createTicketSchema", () => {
  it("aceita payload válido", () => {
    expect(createTicketSchema.safeParse(buildTicketInput()).success).toBe(true)
  })

  it("rejeita categorySystemKey vazio", () => {
    expect(
      createTicketSchema.safeParse(buildTicketInput({ categorySystemKey: "" }))
        .success,
    ).toBe(false)
  })

  it("rejeita subject com menos de 5 caracteres", () => {
    expect(
      createTicketSchema.safeParse(buildTicketInput({ subject: "abcd" })).success,
    ).toBe(false)
  })

  it("aceita subject no limite mínimo (5 caracteres)", () => {
    expect(
      createTicketSchema.safeParse(buildTicketInput({ subject: "abcde" })).success,
    ).toBe(true)
  })

  it("rejeita subject com mais de 200 caracteres", () => {
    expect(
      createTicketSchema.safeParse(buildTicketInput({ subject: "a".repeat(201) }))
        .success,
    ).toBe(false)
  })

  it("aceita subject no limite máximo (200 caracteres)", () => {
    expect(
      createTicketSchema.safeParse(buildTicketInput({ subject: "a".repeat(200) }))
        .success,
    ).toBe(true)
  })

  it("rejeita description com menos de 10 caracteres", () => {
    expect(
      createTicketSchema.safeParse(buildTicketInput({ description: "curta" }))
        .success,
    ).toBe(false)
  })

  it("aceita description no limite mínimo (10 caracteres)", () => {
    expect(
      createTicketSchema.safeParse(
        buildTicketInput({ description: "a".repeat(10) }),
      ).success,
    ).toBe(true)
  })

  it("rejeita description com mais de 5000 caracteres", () => {
    expect(
      createTicketSchema.safeParse(
        buildTicketInput({ description: "a".repeat(5001) }),
      ).success,
    ).toBe(false)
  })

  it("aceita description no limite máximo (5000 caracteres)", () => {
    expect(
      createTicketSchema.safeParse(
        buildTicketInput({ description: "a".repeat(5000) }),
      ).success,
    ).toBe(true)
  })
})

describe("addResponseSchema", () => {
  it("rejeita body vazio", () => {
    expect(addResponseSchema.safeParse({ body: "" }).success).toBe(false)
  })

  it("aceita body com 1 caractere", () => {
    expect(addResponseSchema.safeParse({ body: "a" }).success).toBe(true)
  })

  it("rejeita body com mais de 5000 caracteres", () => {
    expect(
      addResponseSchema.safeParse({ body: "a".repeat(5001) }).success,
    ).toBe(false)
  })

  it("aceita body no limite máximo (5000 caracteres)", () => {
    expect(
      addResponseSchema.safeParse({ body: "a".repeat(5000) }).success,
    ).toBe(true)
  })
})
