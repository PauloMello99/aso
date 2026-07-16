import { describe, expect, it } from "vitest"
import { shouldShowDeleteAccount } from "./can-delete-account"

describe("shouldShowDeleteAccount", () => {
  it("returns true when the user has no organizations", () => {
    expect(shouldShowDeleteAccount([])).toBe(true)
  })

  it("returns true when the user owns at least one organization", () => {
    expect(shouldShowDeleteAccount([{ role: "owner" }])).toBe(true)
  })

  it("returns false when the user is only an employee in all organizations", () => {
    expect(shouldShowDeleteAccount([{ role: "employee" }])).toBe(false)
    expect(
      shouldShowDeleteAccount([{ role: "employee" }, { role: "employee" }]),
    ).toBe(false)
  })

  it("returns true when the user owns at least one organization among many", () => {
    expect(
      shouldShowDeleteAccount([{ role: "owner" }, { role: "employee" }]),
    ).toBe(true)
  })
})
