import { describe, expect, it } from "vitest"
import { ORG_NAV_SECTIONS } from "./nav"
import {
  ONBOARDING_MODULES,
  ONBOARDING_MODULE_META,
  getPendingOnboardingModules,
  type OnboardingModule,
} from "./onboarding-modules"
import { getPendingTourSteps, getTourSteps } from "./onboarding-tour"
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

const owner = makeOrg()
const ids = (mods: OnboardingModule[]) => mods.map((m) => m.id)

describe("getPendingOnboardingModules", () => {
  it("marks every visible module as pending for a new user", () => {
    const pending = getPendingOnboardingModules(owner, {
      onboardingSeen: {},
      onboardingCompletedAt: null,
    })
    expect(ids(pending)).toEqual(ids(ONBOARDING_MODULES))
  })

  it("has nothing pending for a legacy user who completed after introduction", () => {
    const pending = getPendingOnboardingModules(owner, {
      onboardingSeen: {},
      onboardingCompletedAt: "2026-08-01T10:00:00.000Z",
    })
    expect(pending).toEqual([])
  })

  it("treats a module introduced after completion as pending", () => {
    const pending = getPendingOnboardingModules(owner, {
      onboardingSeen: {},
      onboardingCompletedAt: "2026-07-10T10:00:00.000Z",
    })
    expect(ids(pending)).toEqual(ids(ONBOARDING_MODULES))
  })

  it("marks only a new module introduced after completion as pending for a legacy user", () => {
    const newModule: OnboardingModule = {
      id: "novo-modulo",
      version: 1,
      introducedAt: "2026-09-20T12:00:00Z",
      steps: [{ selector: null, title: "Novo", description: "Novo modulo" }],
    }
    const modules = [...ONBOARDING_MODULES, newModule]
    const pending = getPendingOnboardingModules(
      owner,
      { onboardingSeen: {}, onboardingCompletedAt: "2026-08-01T10:00:00.000Z" },
      modules,
    )
    expect(ids(pending)).toEqual(["novo-modulo"])
  })

  it("is not pending when seen version is current, pending again after a bump", () => {
    const seenAll = Object.fromEntries(ONBOARDING_MODULES.map((m) => [m.id, 1]))
    expect(
      getPendingOnboardingModules(owner, {
        onboardingSeen: seenAll,
        onboardingCompletedAt: null,
      }),
    ).toEqual([])

    const bumped = ONBOARDING_MODULES.map((m) =>
      m.id === "stock" ? { ...m, version: 2 } : m,
    )
    const stock = bumped.find((m) => m.id === "stock")
    expect(
      ids(
        getPendingOnboardingModules(
          owner,
          { onboardingSeen: seenAll, onboardingCompletedAt: null },
          bumped,
        ),
      ),
    ).toEqual(["stock"])
    expect(stock?.version).toBe(2)
  })

  it("never returns modules the user cannot access", () => {
    const employee = makeOrg({ role: "employee", permissions: ["services"] })
    const pending = ids(
      getPendingOnboardingModules(employee, {
        onboardingSeen: {},
        onboardingCompletedAt: null,
      }),
    )
    expect(pending).toContain("services")
    expect(pending).not.toContain("stock")
    expect(pending).not.toContain("cashier")
    expect(pending).not.toContain("campaigns")
  })

  it("ignores unknown keys in onboardingSeen", () => {
    const pending = getPendingOnboardingModules(owner, {
      onboardingSeen: { "modulo-inexistente": 5 },
      onboardingCompletedAt: null,
    })
    expect(ids(pending)).toEqual(ids(ONBOARDING_MODULES))
  })

  it("only clears the module whose seen version matches", () => {
    const pending = getPendingOnboardingModules(owner, {
      onboardingSeen: { stock: 1 },
      onboardingCompletedAt: null,
    })
    expect(ids(pending)).not.toContain("stock")
    expect(ids(pending)).toContain("cashier")
  })
})

describe("ONBOARDING_MODULES backend contract (PATCH /auth/me onboardingSeen)", () => {
  it("has ids matching the backend key pattern, unique, within the 30 key limit", () => {
    const allIds = ONBOARDING_MODULES.map((m) => m.id)
    for (const id of allIds) {
      expect(id).toMatch(/^[a-z0-9/-]{1,32}$/)
    }
    expect(new Set(allIds).size).toBe(allIds.length)
    expect(allIds.length).toBeLessThanOrEqual(30)
  })

  it("has a meta entry for every nav href and no extra entries", () => {
    const navHrefs = ORG_NAV_SECTIONS.flatMap((s) => s.items).map((i) => i.href)
    for (const href of navHrefs) {
      expect(ONBOARDING_MODULE_META[href], href).toBeDefined()
    }
    expect(Object.keys(ONBOARDING_MODULE_META).sort()).toEqual([...navHrefs].sort())
  })

  it("has parseable introducedAt dates", () => {
    for (const m of ONBOARDING_MODULES) {
      expect(Number.isNaN(Date.parse(m.introducedAt)), m.id).toBe(false)
    }
  })

  it("has integer versions within 1..1000", () => {
    for (const m of ONBOARDING_MODULES) {
      expect(Number.isInteger(m.version)).toBe(true)
      expect(m.version).toBeGreaterThanOrEqual(1)
      expect(m.version).toBeLessThanOrEqual(1000)
    }
  })
})

describe("getPendingTourSteps", () => {
  it("uses the welcome opening for a new user and full tour equals replay", () => {
    const steps = getPendingTourSteps(owner, {
      onboardingSeen: {},
      onboardingCompletedAt: null,
    })
    expect(steps).toEqual(getTourSteps(owner))
    expect(steps[0]?.title).toBe("Bem-vindo(a) ao ASO")
  })

  it("uses the news opening for a returning user with pending modules", () => {
    const steps = getPendingTourSteps(owner, {
      onboardingSeen: {},
      onboardingCompletedAt: "2026-07-10T10:00:00.000Z",
    })
    expect(steps[0]?.title).toBe("Novidades na sua organização")
    expect(steps[steps.length - 1]?.selector).toBe('[data-tour="user-menu"]')
  })

  it("returns no steps when nothing is pending", () => {
    expect(
      getPendingTourSteps(owner, {
        onboardingSeen: {},
        onboardingCompletedAt: "2026-08-01T10:00:00.000Z",
      }),
    ).toEqual([])
  })
})
