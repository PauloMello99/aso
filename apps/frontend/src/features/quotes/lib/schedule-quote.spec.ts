import { describe, expect, it } from "vitest"
import {
  DEFAULT_SCHEDULE_DURATION,
  SCHEDULE_DURATION_OPTIONS,
  buildSchedulePayload,
  formatScheduledLabel,
  isScheduleDuration,
} from "./schedule-quote"

describe("schedule-quote lib", () => {
  it("monta startsAt ISO a partir de data + hora locais", () => {
    const payload = buildSchedulePayload({
      date: "2026-11-05",
      startTime: "14:30",
      durationMinutes: 90,
    })
    expect(payload.startsAt).toBe(new Date(2026, 10, 5, 14, 30).toISOString())
    expect(payload.durationMinutes).toBe(90)
  })

  it("lança para data ou hora inválida", () => {
    expect(() =>
      buildSchedulePayload({ date: "xx", startTime: "14:30", durationMinutes: 60 }),
    ).toThrow()
    expect(() =>
      buildSchedulePayload({ date: "2026-11-05", startTime: "", durationMinutes: 60 }),
    ).toThrow()
  })

  it("mantém a duração padrão dentro das opções e dentro dos limites do backend", () => {
    expect(isScheduleDuration(DEFAULT_SCHEDULE_DURATION)).toBe(true)
    for (const { value } of SCHEDULE_DURATION_OPTIONS) {
      expect(value).toBeGreaterThanOrEqual(15)
      expect(value).toBeLessThanOrEqual(720)
    }
    expect(isScheduleDuration(61)).toBe(false)
  })

  it("formata o rótulo em dd/MM às HH:mm no horário local", () => {
    const iso = new Date(2026, 10, 5, 9, 5).toISOString()
    expect(formatScheduledLabel(iso)).toBe("05/11 às 09:05")
  })
})
