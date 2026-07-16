import type { OrgSummary } from "@/features/dashboard/hooks/use-orgs"

export function shouldShowDeleteAccount(orgs: Pick<OrgSummary, "role">[]): boolean {
  return orgs.length === 0 || orgs.some((o) => o.role === "owner")
}
