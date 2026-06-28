import type { OrgRole } from "@/features/organizations/types"

export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled"

export interface InvitationLookup {
  orgId: string
  orgName: string
  orgSlug: string
  email: string
  role: OrgRole
  status: InvitationStatus
  expired: boolean
  hasAccount: boolean
}

export interface AcceptInvitationResult {
  orgId: string
  orgSlug: string
}
