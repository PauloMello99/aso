import { describe, expect, it } from "vitest"
import { dayEndIso, dayStartIso } from "./day-bounds"

describe("day bounds", () => {
  it("dayStartIso is local midnight and dayEndIso is local 23:59:59.999", () => {
    const start = new Date(dayStartIso("2026-09-10"))
    expect([start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds()]).toEqual([0, 0, 0, 0])
    expect(start.getDate()).toBe(10)
    const end = new Date(dayEndIso("2026-09-10"))
    expect([end.getHours(), end.getMinutes(), end.getSeconds(), end.getMilliseconds()]).toEqual([23, 59, 59, 999])
    expect(end.getDate()).toBe(10)
  })

  it("is idempotent: values that are already instants pass through", () => {
    const start = dayStartIso("2026-09-10")
    const end = dayEndIso("2026-09-10")
    expect(dayStartIso(start)).toBe(start)
    expect(dayEndIso(end)).toBe(end)
  })
})
