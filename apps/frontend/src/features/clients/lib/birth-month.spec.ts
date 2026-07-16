import { describe, expect, it } from "vitest"
import { MONTH_OPTIONS, getMonthLabel } from "./birth-month"

describe("getMonthLabel", () => {
  it("returns the Portuguese label for a valid month", () => {
    expect(getMonthLabel(1)).toBe("Janeiro")
    expect(getMonthLabel(12)).toBe("Dezembro")
  })

  it("returns an empty string for an out-of-range month", () => {
    expect(getMonthLabel(0)).toBe("")
    expect(getMonthLabel(13)).toBe("")
  })

  it("exposes exactly 12 month options", () => {
    expect(MONTH_OPTIONS).toHaveLength(12)
  })
})
