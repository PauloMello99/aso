import { describe, expect, it } from "vitest"
import { scheduleQuoteSchema } from "./schedule-quote.schema"

function build(overrides: Record<string, unknown> = {}) {
  return {
    date: "2026-11-05",
    startTime: "14:30",
    durationMinutes: 60,
    ...overrides,
  }
}

describe("scheduleQuoteSchema", () => {
  it("aceita valores válidos", () => {
    expect(scheduleQuoteSchema.safeParse(build()).success).toBe(true)
  })

  it("exige a data", () => {
    const result = scheduleQuoteSchema.safeParse(build({ date: "" }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Informe a data")
    }
  })

  it("exige o horário de início", () => {
    const result = scheduleQuoteSchema.safeParse(build({ startTime: "" }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Informe o horário")
    }
  })

  it("rejeita horário fora do formato HH:mm", () => {
    expect(scheduleQuoteSchema.safeParse(build({ startTime: "25:00" })).success).toBe(false)
    expect(scheduleQuoteSchema.safeParse(build({ startTime: "9:00" })).success).toBe(false)
  })

  it("rejeita duração fora da lista de opções", () => {
    expect(scheduleQuoteSchema.safeParse(build({ durationMinutes: 61 })).success).toBe(false)
    expect(scheduleQuoteSchema.safeParse(build({ durationMinutes: 10 })).success).toBe(false)
    expect(scheduleQuoteSchema.safeParse(build({ durationMinutes: "60" })).success).toBe(false)
  })
})
