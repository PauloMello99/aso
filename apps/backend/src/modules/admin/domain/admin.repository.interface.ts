export const ADMIN_REPOSITORY = Symbol("ADMIN_REPOSITORY");

export type PlatformRole = "super_admin" | "user";

export interface PlatformStats {
  totalOrgs: number;
  suspendedOrgs: number;
  totalUsers: number;
  superAdmins: number;
  totalMemberships: number;
}

export interface AdminOrgRow {
  id: string;
  name: string;
  slug: string;
  suspendedAt: Date | null;
  memberCount: number;
  ownerName: string | null;
  createdAt: Date;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
  orgCount: number;
  createdAt: Date;
}

export interface GrowthPoint {
  month: string;
  newOrgs: number;
  newUsers: number;
}

export interface AdminOrgMember {
  userId: string;
  name: string;
  email: string;
  role: string;
  enabled: boolean;
  joinedAt: Date;
}

export interface AdminOrgInvitation {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface AdminOrgDetail {
  id: string;
  name: string;
  slug: string;
  suspendedAt: Date | null;
  stockCheckIntervalDays: number | null;
  createdAt: Date;
  owner: { id: string; name: string; email: string } | null;
  memberCount: number;
  members: AdminOrgMember[];
  pendingInvitations: AdminOrgInvitation[];
}

export interface AdminUserMembership {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: string;
  enabled: boolean;
  joinedAt: Date;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  platformRole: PlatformRole;
  createdAt: Date;
  memberships: AdminUserMembership[];
}

export interface IAdminRepository {
  getStats(): Promise<PlatformStats>;
  getGrowthSeries(): Promise<GrowthPoint[]>;
  listOrgs(): Promise<AdminOrgRow[]>;
  listUsers(): Promise<AdminUserRow[]>;
  getOrgDetail(orgId: string): Promise<AdminOrgDetail | null>;
  getUserDetail(userId: string): Promise<AdminUserDetail | null>;
  setOrgSuspended(orgId: string, suspended: boolean): Promise<boolean>;
  setUserPlatformRole(userId: string, role: PlatformRole): Promise<boolean>;
  findUserById(
    userId: string,
  ): Promise<{ id: string; authId: string; platformRole: PlatformRole } | null>;
}
