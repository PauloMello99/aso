import { describe, expect, it } from "vitest"
import { daysUntil, describeExpiry, formatRelative } from "./quote-dates"

const NOW = new Date("2026-10-08T12:00:00.000Z")

describe("daysUntil", () => {
  it("returns whole days remaining, rounded down", () => {
    expect(daysUntil("2026-10-18T12:00:00.000Z", NOW)).toBe(10)
    expect(daysUntil("2026-10-18T11:59:00.000Z", NOW)).toBe(9)
  })

  it("returns 0 within the next 24 hours and negative once expired", () => {
    expect(daysUntil("2026-10-08T14:00:00.000Z", NOW)).toBe(0)
    expect(daysUntil("2026-10-08T12:00:00.000Z", NOW)).toBe(0)
    expect(daysUntil("2026-10-08T11:59:59.000Z", NOW)).toBe(-1)
  })
})

describe("describeExpiry", () => {
  it("uses the info tone with plenty of time left", () => {
    expect(describeExpiry("2026-10-28T12:00:00.000Z", NOW)).toEqual({
      label: "Expira em 20 dias",
      tone: "info",
    })
  })

  it("switches to warning at 3 days or fewer", () => {
    expect(describeExpiry("2026-10-11T12:00:00.000Z", NOW)).toEqual({
      label: "Expira em 3 dias",
      tone: "warning",
    })
    expect(describeExpiry("2026-10-09T12:00:00.000Z", NOW)).toEqual({
      label: "Expira em 1 dia",
      tone: "warning",
    })
  })

  it("labels the last day and expired requests", () => {
    expect(describeExpiry("2026-10-08T20:00:00.000Z", NOW)).toEqual({
      label: "Expira hoje",
      tone: "warning",
    })
    expect(describeExpiry("2026-10-01T12:00:00.000Z", NOW)).toEqual({
      label: "Expirado",
      tone: "destructive",
    })
  })
})

describe("formatRelative", () => {
  it("formats in pt-BR with a suffix", () => {
    expect(formatRelative("2026-10-08T10:00:00.000Z", NOW)).toBe("há cerca de 2 horas")
    expect(formatRelative("2026-10-05T12:00:00.000Z", NOW)).toBe("há 3 dias")
  })
})
