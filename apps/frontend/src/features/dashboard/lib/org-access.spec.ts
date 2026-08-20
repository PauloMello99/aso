import { describe, expect, it } from "vitest"
import { resolveOrgAccess } from "./org-access"
import type { OrgSummary } from "@/features/dashboard/hooks/use-orgs"

function buildOrg(partial: Partial<OrgSummary> = {}): OrgSummary {
  return {
    id: "org-1",
    name: "Org One",
    slug: "org-one",
    logoUrl: null,
    role: "owner",
    permissions: [],
    ...partial,
  }
}

describe("resolveOrgAccess", () => {
  it("owner not super keeps org intact and has no override flags", () => {
    const owner = buildOrg({ role: "owner" })

    const access = resolveOrgAccess({ listOrg: owner, resolvedOrg: null, isSuper: false, loading: false })

    expect(access.org).toEqual(owner)
    expect(access.hasMembership).toBe(true)
    expect(access.actingAsAdmin).toBe(false)
    expect(access.superWithMembership).toBe(false)
  })

  it("employee not super keeps role and permissions without override", () => {
    const employee = buildOrg({ role: "employee", permissions: ["services"] })

    const access = resolveOrgAccess({ listOrg: employee, resolvedOrg: null, isSuper: false, loading: false })

    expect(access.org?.role).toBe("employee")
    expect(access.org?.permissions).toEqual(["services"])
    expect(access.actingAsAdmin).toBe(false)
    expect(access.superWithMembership).toBe(false)
  })

  it("super without membership acts as owner via synthetic override", () => {
    const resolvedOrg = buildOrg({ role: "employee", permissions: ["services"] })

    const access = resolveOrgAccess({ listOrg: undefined, resolvedOrg, isSuper: true, loading: false })

    expect(access.org?.role).toBe("owner")
    expect(access.org?.permissions).toEqual(["services"])
    expect(access.hasMembership).toBe(false)
    expect(access.actingAsAdmin).toBe(true)
    expect(access.superWithMembership).toBe(false)
  })

  it("super with real employee membership keeps real role and permissions", () => {
    const employee = buildOrg({ role: "employee", permissions: ["services", "clients"] })

    const access = resolveOrgAccess({ listOrg: employee, resolvedOrg: null, isSuper: true, loading: false })

    expect(access.org?.role).toBe("employee")
    expect(access.org?.permissions).toEqual(["services", "clients"])
    expect(access.actingAsAdmin).toBe(false)
    expect(access.superWithMembership).toBe(true)
  })

  it("super with real owner membership keeps role owner without synthesizing", () => {
    const owner = buildOrg({ role: "owner" })

    const access = resolveOrgAccess({ listOrg: owner, resolvedOrg: null, isSuper: true, loading: false })

    expect(access.org?.role).toBe("owner")
    expect(access.actingAsAdmin).toBe(false)
    expect(access.superWithMembership).toBe(true)
  })

  it("listOrg wins over stale resolvedOrg and no override happens", () => {
    const listOrg = buildOrg({ role: "employee", permissions: ["stock"] })
    const resolvedOrg = buildOrg({ role: "owner" })

    const access = resolveOrgAccess({ listOrg, resolvedOrg, isSuper: true, loading: false })

    expect(access.org?.role).toBe("employee")
    expect(access.org?.permissions).toEqual(["stock"])
    expect(access.actingAsAdmin).toBe(false)
    expect(access.superWithMembership).toBe(true)
  })

  it("loading true returns undefined org and all flags false even with resolvedOrg present", () => {
    const resolvedOrg = buildOrg({ role: "owner" })

    const access = resolveOrgAccess({ listOrg: undefined, resolvedOrg, isSuper: true, loading: true })

    expect(access.org).toBeUndefined()
    expect(access.hasMembership).toBe(false)
    expect(access.actingAsAdmin).toBe(false)
    expect(access.superWithMembership).toBe(false)
  })

  it("no listOrg, no resolvedOrg, not super returns undefined org", () => {
    const access = resolveOrgAccess({ listOrg: undefined, resolvedOrg: null, isSuper: false, loading: false })

    expect(access.org).toBeUndefined()
    expect(access.hasMembership).toBe(false)
    expect(access.actingAsAdmin).toBe(false)
    expect(access.superWithMembership).toBe(false)
  })
})
