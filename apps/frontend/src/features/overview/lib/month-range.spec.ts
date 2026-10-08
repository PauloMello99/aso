import { describe, expect, it } from "vitest"
import {
  canGoNext,
  clampToCurrent,
  currentMonth,
  formatMonthLabel,
  isCurrentMonth,
  monthKey,
  monthRange,
  shiftMonth,
} from "./month-range"

const NOW = new Date(2026, 9, 7, 15, 30, 0, 0) // 7/out/2026 local

describe("shiftMonth", () => {
  it("goes back across the year boundary", () => {
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({
      year: 2025,
      month: 11,
    })
  })

  it("goes forward across the year boundary", () => {
    expect(shiftMonth({ year: 2025, month: 11 }, 1)).toEqual({
      year: 2026,
      month: 0,
    })
  })

  it("handles multi-month jumps", () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -14)).toEqual({
      year: 2024,
      month: 11,
    })
  })
})

describe("monthKey / formatMonthLabel", () => {
  it("builds a stable zero-padded key", () => {
    expect(monthKey({ year: 2026, month: 0 })).toBe("2026-01")
    expect(monthKey(currentMonth(NOW))).toBe("2026-10")
  })

  it("formats the pt-BR label", () => {
    expect(formatMonthLabel({ year: 2026, month: 9 })).toBe("outubro de 2026")
    expect(formatMonthLabel({ year: 2026, month: 2 })).toBe("março de 2026")
  })
})

describe("future blocking", () => {
  it("blocks next on the current month", () => {
    expect(canGoNext(currentMonth(NOW), NOW)).toBe(false)
  })

  it("allows next on a past month, up to the current one", () => {
    expect(canGoNext({ year: 2026, month: 8 }, NOW)).toBe(true)
    expect(canGoNext({ year: 2025, month: 11 }, NOW)).toBe(true)
  })

  it("clamps a future month to the current one", () => {
    expect(clampToCurrent({ year: 2027, month: 0 }, NOW)).toEqual(
      currentMonth(NOW),
    )
    expect(clampToCurrent({ year: 2026, month: 3 }, NOW)).toEqual({
      year: 2026,
      month: 3,
    })
  })
})

describe("monthRange", () => {
  it("uses 'now' as the end for the current month", () => {
    const r = monthRange(currentMonth(NOW), NOW)
    expect(r.from).toBe(new Date(2026, 9, 1, 0, 0, 0, 0).toISOString())
    expect(r.to).toBe(NOW.toISOString())
    expect(isCurrentMonth(currentMonth(NOW), NOW)).toBe(true)
  })

  it("covers the whole past month, to 23:59:59.999 of the last day", () => {
    const r = monthRange({ year: 2026, month: 8 }, NOW)
    expect(r.from).toBe(new Date(2026, 8, 1, 0, 0, 0, 0).toISOString())
    expect(r.to).toBe(new Date(2026, 8, 30, 23, 59, 59, 999).toISOString())
  })

  it("handles December (year rollover) and leap February", () => {
    const dec = monthRange({ year: 2025, month: 11 }, NOW)
    expect(dec.to).toBe(new Date(2025, 11, 31, 23, 59, 59, 999).toISOString())
    const feb = monthRange({ year: 2024, month: 1 }, NOW)
    expect(feb.to).toBe(new Date(2024, 1, 29, 23, 59, 59, 999).toISOString())
  })
})
