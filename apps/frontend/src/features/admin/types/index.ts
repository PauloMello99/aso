export type PlatformRole = "super_admin" | "user"

export interface PlatformStats {
  totalOrgs: number
  suspendedOrgs: number
  totalUsers: number
  superAdmins: number
  totalMemberships: number
}

export interface AdminOrg {
  id: string
  name: string
  slug: string
  suspendedAt: string | null
  memberCount: number
  ownerName: string | null
  createdAt: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  platformRole: PlatformRole
  orgCount: number
  createdAt: string
}

export interface GrowthPoint {
  month: string
  newOrgs: number
  newUsers: number
}

export interface AdminOrgMember {
  userId: string
  name: string
  email: string
  role: string
  enabled: boolean
  joinedAt: string
}

export interface AdminOrgInvitation {
  id: string
  email: string
  role: string
  createdAt: string
  expiresAt: string
}

export interface AdminOrgDetail {
  id: string
  name: string
  slug: string
  suspendedAt: string | null
  stockCheckIntervalDays: number | null
  createdAt: string
  owner: { id: string; name: string; email: string } | null
  memberCount: number
  members: AdminOrgMember[]
  pendingInvitations: AdminOrgInvitation[]
}

export interface AdminUserMembership {
  orgId: string
  orgName: string
  orgSlug: string
  role: string
  enabled: boolean
  joinedAt: string
}

export interface AdminUserDetail {
  id: string
  name: string
  email: string
  phone: string | null
  platformRole: PlatformRole
  createdAt: string
  memberships: AdminUserMembership[]
}

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "invite_sent"
  | "invite_accepted"
  | "subscription_changed"
  | "anamnesis_invite_sent"
  | "customer_self_registration_invite_sent"
  | "customer_self_registered"
  | "customer_update_invite_sent"
  | "customer_self_updated"
  | "anamnesis_invite_resent"
  | "anamnesis_copy_sent"
  | "cashier_transaction_created"
  | "cashier_fees_updated"
  | "cashier_commissions_updated"
  | "org_admin_access"

export interface AuditLogEntry {
  id: string
  actor: { id: string; name: string; email: string } | null
  org: { id: string; name: string; slug: string } | null
  action: AuditAction
  entityType: string
  entityId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AuditLogFilters {
  page?: number
  limit?: number
  orgId?: string
  actorId?: string
  action?: AuditAction
  entityType?: string
  from?: string
  to?: string
}

export interface AuditLogPage {
  data: AuditLogEntry[]
  total: number
  page: number
  pages: number
}

export type AdminNotificationType =
  | "agenda_reminder"
  | "member_unavailability"
  | "stock_check_reminder"

export interface AdminOrgNotification {
  id: string
  userId: string
  orgId: string | null
  type: AdminNotificationType
  title: string
  body: string | null
  data: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

export type OrgStatusFilter = "all" | "active" | "suspended"
export type UserRoleFilter = "all" | "super_admin" | "user"
export type OrgSortKey = "name" | "createdAt" | "memberCount"
export type UserSortKey = "name" | "createdAt" | "orgCount"
export type SortDir = "asc" | "desc"
