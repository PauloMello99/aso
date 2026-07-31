import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  ageAt,
  checkAgeRequirement,
  parseYmd,
  todayYmd,
} from "./age"

describe("parseYmd", () => {
  it("parses a valid YYYY-MM-DD string", () => {
    expect(parseYmd("1990-05-20")).toEqual({ y: 1990, m: 5, d: 20 })
  })

  it("returns null for a malformed date (dd/mm/yyyy)", () => {
    expect(parseYmd("01/01/1990")).toBeNull()
  })

  it("returns null for an empty string", () => {
    expect(parseYmd("")).toBeNull()
  })
})

describe("ageAt", () => {
  it("returns exactly 18 on the 18th birthday", () => {
    expect(ageAt("2008-07-31", "2026-07-31")).toBe(18)
  })

  it("returns 17 one day before the 18th birthday", () => {
    expect(ageAt("2008-07-31", "2026-07-30")).toBe(17)
  })

  it("returns null when birthDate is malformed", () => {
    expect(ageAt("01/01/1990", "2026-07-31")).toBeNull()
  })
})

describe("checkAgeRequirement", () => {
  it("returns ok when the customer turns 18 exactly on the performed date", () => {
    expect(checkAgeRequirement("2008-07-31", "2026-07-31")).toBe("ok")
  })

  it("returns minor one day before the 18th birthday", () => {
    expect(checkAgeRequirement("2008-07-31", "2026-07-30")).toBe("minor")
  })

  it("returns unknown for an empty birth date", () => {
    expect(checkAgeRequirement("", "2026-07-31")).toBe("unknown")
  })

  it("returns unknown for a malformed birth date (dd/mm/yyyy)", () => {
    expect(checkAgeRequirement("01/01/1990", "2026-07-31")).toBe("unknown")
  })

  describe("with performedAt empty (uses today)", () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 6, 31, 12, 0, 0))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("uses today's local date when performedAt is empty", () => {
      expect(todayYmd()).toBe("2026-07-31")
      expect(checkAgeRequirement("2008-07-31", "")).toBe("ok")
      expect(checkAgeRequirement("2008-08-01", "")).toBe("minor")
    })
  })
})
