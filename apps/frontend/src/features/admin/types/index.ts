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
