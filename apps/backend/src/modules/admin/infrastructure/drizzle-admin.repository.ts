import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../database/database.module";
import * as schema from "../../../database/schema";
import {
  AdminOrgRow,
  AdminUserRow,
  IAdminRepository,
  PlatformRole,
  PlatformStats,
} from "../domain/admin.repository.interface";

/**
 * Repositório de leitura/gestão da plataforma (PLAT-1). Usa a conexão
 * privilegiada (BYPASSRLS) — o acesso já é restrito ao super_admin pelo
 * {@link PlatformAdminGuard}, e as consultas são cross-org por natureza.
 */
@Injectable()
export class DrizzleAdminRepository implements IAdminRepository {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async getStats(): Promise<PlatformStats> {
    const { rows } = await this.db.execute<{
      total_orgs: number;
      suspended_orgs: number;
      total_users: number;
      super_admins: number;
      total_memberships: number;
    }>(sql`
      SELECT
        (SELECT COUNT(*) FROM organizations)::int AS total_orgs,
        (SELECT COUNT(*) FROM organizations WHERE suspended_at IS NOT NULL)::int AS suspended_orgs,
        (SELECT COUNT(*) FROM users)::int AS total_users,
        (SELECT COUNT(*) FROM users WHERE platform_role = 'super_admin')::int AS super_admins,
        (SELECT COUNT(*) FROM org_memberships)::int AS total_memberships
    `);
    const r = rows[0];
    return {
      totalOrgs: Number(r?.total_orgs ?? 0),
      suspendedOrgs: Number(r?.suspended_orgs ?? 0),
      totalUsers: Number(r?.total_users ?? 0),
      superAdmins: Number(r?.super_admins ?? 0),
      totalMemberships: Number(r?.total_memberships ?? 0),
    };
  }

  async listOrgs(): Promise<AdminOrgRow[]> {
    const { rows } = await this.db.execute<{
      id: string;
      name: string;
      slug: string;
      suspended_at: string | null;
      created_at: string;
      member_count: number;
      owner_name: string | null;
    }>(sql`
      SELECT o.id, o.name, o.slug, o.suspended_at, o.created_at,
        COUNT(DISTINCT m.id)::int AS member_count,
        (
          SELECT u.name FROM org_memberships om
          JOIN users u ON u.id = om.user_id
          WHERE om.org_id = o.id AND om.role = 'owner'
          ORDER BY om.joined_at ASC LIMIT 1
        ) AS owner_name
      FROM organizations o
      LEFT JOIN org_memberships m ON m.org_id = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      suspendedAt: r.suspended_at ? new Date(r.suspended_at) : null,
      memberCount: Number(r.member_count),
      ownerName: r.owner_name,
      createdAt: new Date(r.created_at),
    }));
  }

  async listUsers(): Promise<AdminUserRow[]> {
    const { rows } = await this.db.execute<{
      id: string;
      name: string;
      email: string;
      platform_role: PlatformRole;
      created_at: string;
      org_count: number;
    }>(sql`
      SELECT u.id, u.name, u.email, u.platform_role, u.created_at,
        COUNT(m.id)::int AS org_count
      FROM users u
      LEFT JOIN org_memberships m ON m.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      platformRole: r.platform_role,
      orgCount: Number(r.org_count),
      createdAt: new Date(r.created_at),
    }));
  }

  async setOrgSuspended(orgId: string, suspended: boolean): Promise<boolean> {
    const rows = await this.db
      .update(schema.organizations)
      .set({ suspendedAt: suspended ? new Date() : null, updatedAt: new Date() })
      .where(eq(schema.organizations.id, orgId))
      .returning({ id: schema.organizations.id });
    return rows.length > 0;
  }

  async setUserPlatformRole(
    userId: string,
    role: PlatformRole,
  ): Promise<boolean> {
    const rows = await this.db
      .update(schema.users)
      .set({ platformRole: role, updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
      .returning({ id: schema.users.id });
    return rows.length > 0;
  }

  async findUserById(
    userId: string,
  ): Promise<{ id: string; authId: string; platformRole: PlatformRole } | null> {
    const [row] = await this.db
      .select({
        id: schema.users.id,
        authId: schema.users.authId,
        platformRole: schema.users.platformRole,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return row ?? null;
  }
}
