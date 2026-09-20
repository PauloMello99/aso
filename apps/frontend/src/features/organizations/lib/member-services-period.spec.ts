import { describe, expect, it } from "vitest"
import { dayEndIso, dayStartIso } from "@/shared/lib/day-bounds"
import {
  ALL_SERVICES_FROM,
  buildMemberServicesFilter,
  formatMemberServicesPeriod,
  MEMBER_LIST_PAGE_SIZE,
  patchServicesFilter,
} from "./member-services-period"

describe("buildMemberServicesFilter", () => {
  it("asks for the full history by default and pins the member", () => {
    expect(buildMemberServicesFilter({}, "u1")).toEqual({
      from: dayStartIso(ALL_SERVICES_FROM),
      to: undefined,
      performedBy: "u1",
      page: 1,
      limit: MEMBER_LIST_PAGE_SIZE,
    })
  })

  it("keeps an explicit from (start of day) and other filters", () => {
    expect(
      buildMemberServicesFilter({ from: "2026-01-01", status: "paid" }, "u1"),
    ).toEqual({
      from: dayStartIso("2026-01-01"),
      to: undefined,
      status: "paid",
      performedBy: "u1",
      page: 1,
      limit: MEMBER_LIST_PAGE_SIZE,
    })
  })

  it("keeps the requested page and forces the server page size", () => {
    const out = buildMemberServicesFilter({ page: 3, limit: 200 }, "u1")
    expect(out.page).toBe(3)
    expect(out.limit).toBe(MEMBER_LIST_PAGE_SIZE)
  })

  it("falls back to the full history when from was cleared to undefined", () => {
    const out = buildMemberServicesFilter({ from: undefined, to: "2026-02-01" }, "u1")
    expect(out.from).toBe(dayStartIso(ALL_SERVICES_FROM))
  })

  it("sends to as the end of that day so the last day is included", () => {
    const out = buildMemberServicesFilter({ to: "2026-09-10" }, "u1")
    expect(out.to).toBe(dayEndIso("2026-09-10"))
  })

  it("does not let the caller override the member", () => {
    expect(buildMemberServicesFilter({ performedBy: "other" }, "u1").performedBy).toBe("u1")
  })
})

describe("patchServicesFilter", () => {
  it("merges the patch and resets to page 1", () => {
    expect(
      patchServicesFilter({ status: "paid", page: 4 }, { q: "ana" }),
    ).toEqual({ status: "paid", q: "ana", page: 1 })
  })

  it("lets the patch clear a field", () => {
    expect(patchServicesFilter({ status: "paid", page: 2 }, { status: undefined })).toEqual({
      status: undefined,
      page: 1,
    })
  })
})

describe("formatMemberServicesPeriod", () => {
  it("labels the default as all periods", () => {
    expect(formatMemberServicesPeriod({})).toBe("Todos os períodos")
  })

  it("formats a closed range", () => {
    expect(formatMemberServicesPeriod({ from: "2026-01-05", to: "2026-02-10" })).toBe(
      "De 05/01/2026 até 10/02/2026",
    )
  })

  it("formats open-ended ranges", () => {
    expect(formatMemberServicesPeriod({ from: "2026-01-05" })).toBe("A partir de 05/01/2026")
    expect(formatMemberServicesPeriod({ to: "2026-02-10" })).toBe("Até 10/02/2026")
  })
})
