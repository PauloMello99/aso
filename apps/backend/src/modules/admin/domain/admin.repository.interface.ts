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

export interface IAdminRepository {
  getStats(): Promise<PlatformStats>;
  listOrgs(): Promise<AdminOrgRow[]>;
  listUsers(): Promise<AdminUserRow[]>;
  /** Marca/desmarca a org como suspensa. Retorna false se a org não existe. */
  setOrgSuspended(orgId: string, suspended: boolean): Promise<boolean>;
  /** Define o platform_role de um usuário. Retorna false se o usuário não existe. */
  setUserPlatformRole(userId: string, role: PlatformRole): Promise<boolean>;
  /** Usuário pelo id da app (para checagens de auto-rebaixamento). */
  findUserById(
    userId: string,
  ): Promise<{ id: string; authId: string; platformRole: PlatformRole } | null>;
}
