import { describe, expect, it } from "vitest"
import { getTourSteps } from "./onboarding-tour"
import type { OrgSummary } from "../hooks/use-orgs"

function makeOrg(overrides: Partial<OrgSummary> = {}): OrgSummary {
  return {
    id: "org-1",
    name: "Studio Exemplo",
    slug: "studio-exemplo",
    logoUrl: null,
    role: "owner",
    permissions: [],
    ...overrides,
  }
}

describe("getTourSteps", () => {
  it("shows a step for every module in ORG_NAV_SECTIONS to an owner", () => {
    const org = makeOrg({ role: "owner", permissions: [] })
    const steps = getTourSteps(org)

    expect(steps).toHaveLength(11)
    expect(steps.map((s) => s.selector)).toEqual([
      null,
      '[data-tour="nav-overview"]',
      '[data-tour="nav-services"]',
      '[data-tour="nav-anamnesis"]',
      '[data-tour="nav-clients"]',
      '[data-tour="nav-schedule"]',
      '[data-tour="nav-stock"]',
      '[data-tour="nav-cashier"]',
      '[data-tour="nav-settings"]',
      '[data-tour="nav-support"]',
      '[data-tour="user-menu"]',
    ])
  })

  it("shows only the modules an employee has permission for", () => {
    const org = makeOrg({ role: "employee", permissions: ["services"] })
    const steps = getTourSteps(org)

    expect(steps).toHaveLength(7)
    expect(steps.map((s) => s.selector)).toEqual([
      null,
      '[data-tour="nav-overview"]',
      '[data-tour="nav-services"]',
      '[data-tour="nav-anamnesis"]',
      '[data-tour="nav-settings"]',
      '[data-tour="nav-support"]',
      '[data-tour="user-menu"]',
    ])

    const selectors = steps.map((s) => s.selector)
    expect(selectors).not.toContain('[data-tour="nav-clients"]')
    expect(selectors).not.toContain('[data-tour="nav-schedule"]')
    expect(selectors).not.toContain('[data-tour="nav-stock"]')
    expect(selectors).not.toContain('[data-tour="nav-cashier"]')
  })

  it("always includes the welcome step first and the final step last", () => {
    const owner = getTourSteps(makeOrg({ role: "owner", permissions: [] }))
    const employee = getTourSteps(
      makeOrg({ role: "employee", permissions: [] }),
    )

    for (const steps of [owner, employee]) {
      expect(steps[0]).toMatchObject({ selector: null })
      expect(steps[steps.length - 1]).toMatchObject({
        selector: '[data-tour="user-menu"]',
      })
    }
  })

  it("always shows overview and settings regardless of role or permissions", () => {
    const employeeNoPermissions = getTourSteps(
      makeOrg({ role: "employee", permissions: [] }),
    )
    const selectors = employeeNoPermissions.map((s) => s.selector)

    expect(selectors).toContain('[data-tour="nav-overview"]')
    expect(selectors).toContain('[data-tour="nav-settings"]')
  })
})
