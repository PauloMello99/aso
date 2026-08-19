import type { OrgSummary } from "@/features/dashboard/hooks/use-orgs"

export interface ResolveOrgAccessInput {
  listOrg: OrgSummary | undefined
  resolvedOrg: OrgSummary | null
  isSuper: boolean
  loading: boolean
}

export interface OrgAccess {
  org: OrgSummary | undefined
  hasMembership: boolean
  actingAsAdmin: boolean
  superWithMembership: boolean
}

// Espelha o backend (OrgModuleGuard + DrizzleOrgRepository.findBySlugAndAuthId/findByIdAsOwner): role real prevalece quando há membership; owner sintético só sem membership.
export function resolveOrgAccess(input: ResolveOrgAccessInput): OrgAccess {
  const hasMembership = input.listOrg !== undefined

  if (input.loading) {
    return { org: undefined, hasMembership: false, actingAsAdmin: false, superWithMembership: false }
  }

  const base = input.listOrg ?? input.resolvedOrg ?? undefined
  const actingAsAdmin = input.isSuper && !hasMembership
  const superWithMembership = input.isSuper && hasMembership
  const org = base && actingAsAdmin && base.role !== "owner" ? { ...base, role: "owner" as const } : base

  return { org, hasMembership, actingAsAdmin, superWithMembership }
}
