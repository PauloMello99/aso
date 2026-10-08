import { describe, expect, it } from "vitest"
import { eventFormSchema } from "./agenda.schemas"

const base = {
  type: "appointment" as const,
  title: "Tatuagem",
  date: "2026-10-10",
  startTime: "09:00",
  endTime: "10:00",
  visibility: "private" as const,
}

describe("eventFormSchema customerEmail", () => {
  it("rejeita e-mail inválido", () => {
    const r = eventFormSchema.safeParse({ ...base, customerEmail: "nao-e-email" })
    expect(r.success).toBe(false)
  })

  it("aceita e-mail válido", () => {
    expect(
      eventFormSchema.safeParse({ ...base, customerEmail: "a@b.com" }).success,
    ).toBe(true)
  })

  it("aceita e-mail vazio", () => {
    expect(eventFormSchema.safeParse({ ...base, customerEmail: "" }).success).toBe(
      true,
    )
  })

  it("aceita atendimento sem e-mail", () => {
    expect(eventFormSchema.safeParse(base).success).toBe(true)
  })
})
