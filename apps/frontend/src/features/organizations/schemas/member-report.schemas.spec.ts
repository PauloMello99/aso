import { describe, expect, it } from "vitest"
import { memberReportFormSchema } from "./member-report.schemas"

function firstIssue(from: string, to: string) {
  const r = memberReportFormSchema.safeParse({ from, to })
  return r.success ? null : r.error.issues[0]
}

describe("memberReportFormSchema", () => {
  it("aceita periodo valido", () => {
    expect(
      memberReportFormSchema.safeParse({ from: "2026-09-01", to: "2026-09-19" })
        .success,
    ).toBe(true)
  })

  it("aceita de == ate", () => {
    expect(
      memberReportFormSchema.safeParse({ from: "2026-09-01", to: "2026-09-01" })
        .success,
    ).toBe(true)
  })

  it("exige as duas datas", () => {
    expect(firstIssue("", "2026-09-01")?.path).toEqual(["from"])
    expect(firstIssue("2026-09-01", "")?.path).toEqual(["to"])
  })

  it("rejeita de > ate", () => {
    const issue = firstIssue("2026-09-10", "2026-09-01")
    expect(issue?.path).toEqual(["to"])
    expect(issue?.message).toMatch(/anterior/)
  })

  it("rejeita data inexistente", () => {
    expect(firstIssue("2026-02-30", "2026-03-01")?.path).toEqual(["from"])
  })

  it("aceita janela de exatamente 366 dias (inclusiva) e rejeita 367", () => {
    // 2026-01-01..2027-01-01 = 366 dias inclusivos (2026 nao e bissexto: 365 + 1)
    expect(
      memberReportFormSchema.safeParse({ from: "2026-01-01", to: "2027-01-01" })
        .success,
    ).toBe(true)
    const issue = firstIssue("2026-01-01", "2027-01-02")
    expect(issue?.path).toEqual(["to"])
    expect(issue?.message).toMatch(/366/)
  })
})
