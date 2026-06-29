export const ADMIN_REPOSITORY = Symbol("ADMIN_REPOSITORY");

export type PlatformRole = "super_admin" | "user";

/** KPIs globais da plataforma (super_admin). */
export interface PlatformStats {
  totalOrgs: number;
  suspendedOrgs: number;
  totalUsers: number;
  superAdmins: number;
  totalMemberships: number;
}

/** Linha de organização no painel da plataforma. */
export interface AdminOrgRow {
  id: string;
  name: string;
  slug: string;
  suspendedAt: Date | null;
  memberCount: number;
  ownerName: string | null;
  createdAt: Date;
}

/** Linha de usuário no painel da plataforma. */
export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
  orgCount: number;
  createdAt: Date;
}

/** Ponto da série de crescimento da plataforma (novos por mês). */
export interface GrowthPoint {
  /** Mês no formato "YYYY-MM". */
  month: string;
  newOrgs: number;
  newUsers: number;
}

/** Membro de uma org no detalhe da plataforma. */
export interface AdminOrgMember {
  userId: string;
  name: string;
  email: string;
  /** org_role: "owner" | "employee". */
  role: string;
  enabled: boolean;
  joinedAt: Date;
}

/** Convite pendente no detalhe da org. */
export interface AdminOrgInvitation {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  expiresAt: Date;
}

/** Detalhe de uma organização (drill-down). */
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

/** Membership de um usuário no detalhe (drill-down). */
export interface AdminUserMembership {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: string;
  enabled: boolean;
  joinedAt: Date;
}

/** Detalhe de um usuário (drill-down). */
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
  /** Novos orgs/users por mês nos últimos 12 meses (meses vazios incluídos). */
  getGrowthSeries(): Promise<GrowthPoint[]>;
  listOrgs(): Promise<AdminOrgRow[]>;
  listUsers(): Promise<AdminUserRow[]>;
  /** Detalhe de uma org (membros + convites). Null se não existe. */
  getOrgDetail(orgId: string): Promise<AdminOrgDetail | null>;
  /** Detalhe de um usuário (memberships). Null se não existe. */
  getUserDetail(userId: string): Promise<AdminUserDetail | null>;
  /** Marca/desmarca a org como suspensa. Retorna false se a org não existe. */
  setOrgSuspended(orgId: string, suspended: boolean): Promise<boolean>;
  /** Define o platform_role de um usuário. Retorna false se o usuário não existe. */
  setUserPlatformRole(userId: string, role: PlatformRole): Promise<boolean>;
  /** Usuário pelo id da app (para checagens de auto-rebaixamento). */
  findUserById(
    userId: string,
  ): Promise<{ id: string; authId: string; platformRole: PlatformRole } | null>;
}
