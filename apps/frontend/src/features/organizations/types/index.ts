export type OrgRole = "owner" | "employee"
export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled"

export interface Member {
  memberId: string
  orgId: string
  userId: string
  role: OrgRole
  enabled: boolean
  /** Módulos liberados ao funcionário (owner = acesso total, ignora). */
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

/** Resposta do convite: a invitation + o link de aceite (exposto p/ teste em dev). */
export interface InviteResult {
  invitation: Invitation
  acceptUrl: string
}
