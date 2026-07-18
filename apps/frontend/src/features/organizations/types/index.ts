export type OrgRole = "owner" | "employee"
export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled"

export interface Member {
  memberId: string
  orgId: string
  userId: string
  role: OrgRole
  enabled: boolean
  permissions: string[]
  userName: string
  userEmail: string
  joinedAt: string
}

export interface Invitation {
  id: string
  orgId: string
  invitedBy: string
  email: string
  role: OrgRole
  status: InvitationStatus
  expiresAt: string
  createdAt: string
}

export interface InviteResult {
  invitation: Invitation
  acceptUrl: string
}
