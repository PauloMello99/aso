import { Inject, Injectable } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  requestMemo,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  IMemberRepository,
  UpsertMembershipData,
} from "../../domain/member.repository.interface";
import type { MemberEntity } from "../../domain/member.entity";
import type { OrgRole } from "../../domain/org.entity";
import { MemberMapper } from "./member.mapper";

@Injectable()
export class DrizzleMemberRepository implements IMemberRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    // upsert() roda no aceite de convite, antes de o usuário ser membro → bypass RLS.
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async upsert(data: UpsertMembershipData): Promise<void> {
    await this.admin
      .insert(schema.orgMemberships)
      .values({
        orgId: data.orgId,
        userId: data.userId,
        role: data.role,
        permissions: data.permissions ?? [],
        enabled: true,
      })
      .onConflictDoUpdate({
        target: [schema.orgMemberships.orgId, schema.orgMemberships.userId],
        // Re-aceite preserva as permissões já configuradas (só reativa).
        set: { role: data.role, enabled: true },
      });
  }

  async updatePermissions(
    memberId: string,
    permissions: string[],
  ): Promise<MemberEntity> {
    await this.db
      .update(schema.orgMemberships)
      .set({ permissions })
      .where(eq(schema.orgMemberships.id, memberId));

    const [row] = await this.db
      .select({
        memberId: schema.orgMemberships.id,
        orgId: schema.orgMemberships.orgId,
        userId: schema.orgMemberships.userId,
        role: schema.orgMemberships.role,
        enabled: schema.orgMemberships.enabled,
        permissions: schema.orgMemberships.permissions,
        userName: schema.users.name,
        userEmail: schema.users.email,
        joinedAt: schema.orgMemberships.joinedAt,
      })
      .from(schema.orgMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.orgMemberships.userId))
      .where(eq(schema.orgMemberships.id, memberId))
      .limit(1);

    if (!row) throw new Error("Member not found after update");
    return MemberMapper.toDomain(row);
  }

  async findAllByOrg(orgId: string): Promise<MemberEntity[]> {
    const rows = await this.db
      .select({
        memberId: schema.orgMemberships.id,
        orgId: schema.orgMemberships.orgId,
        userId: schema.orgMemberships.userId,
        role: schema.orgMemberships.role,
        enabled: schema.orgMemberships.enabled,
        permissions: schema.orgMemberships.permissions,
        userName: schema.users.name,
        userEmail: schema.users.email,
        joinedAt: schema.orgMemberships.joinedAt,
      })
      .from(schema.orgMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.orgMemberships.userId))
      .where(eq(schema.orgMemberships.orgId, orgId));

    return rows.map(MemberMapper.toDomain);
  }

  async findByMemberId(memberId: string, orgId: string): Promise<MemberEntity | null> {
    const [row] = await this.db
      .select({
        memberId: schema.orgMemberships.id,
        orgId: schema.orgMemberships.orgId,
        userId: schema.orgMemberships.userId,
        role: schema.orgMemberships.role,
        enabled: schema.orgMemberships.enabled,
        permissions: schema.orgMemberships.permissions,
        userName: schema.users.name,
        userEmail: schema.users.email,
        joinedAt: schema.orgMemberships.joinedAt,
      })
      .from(schema.orgMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.orgMemberships.userId))
      .where(
        and(
          eq(schema.orgMemberships.id, memberId),
          eq(schema.orgMemberships.orgId, orgId),
        ),
      )
      .limit(1);

    return row ? MemberMapper.toDomain(row) : null;
  }

  async findByAuthId(
    orgId: string,
    authId: string,
  ): Promise<MemberEntity | null> {
    // Memoizado por request: a mesma associação é resolvida várias vezes no
    // mesmo handler (resolveActor/resolveMembership + overview direto).
    return requestMemo(`member:byAuthId:${orgId}:${authId}`, async () => {
      const [row] = await this.db
        .select({
          memberId: schema.orgMemberships.id,
          orgId: schema.orgMemberships.orgId,
          userId: schema.orgMemberships.userId,
          role: schema.orgMemberships.role,
          enabled: schema.orgMemberships.enabled,
          permissions: schema.orgMemberships.permissions,
          userName: schema.users.name,
          userEmail: schema.users.email,
          joinedAt: schema.orgMemberships.joinedAt,
        })
        .from(schema.orgMemberships)
        .innerJoin(
          schema.users,
          eq(schema.users.id, schema.orgMemberships.userId),
        )
        .where(
          and(
            eq(schema.orgMemberships.orgId, orgId),
            eq(schema.users.authId, authId),
          ),
        )
        .limit(1);

      return row ? MemberMapper.toDomain(row) : null;
    });
  }

  async updateRole(memberId: string, role: OrgRole): Promise<MemberEntity> {
    await this.db
      .update(schema.orgMemberships)
      .set({ role })
      .where(eq(schema.orgMemberships.id, memberId));

    const [row] = await this.db
      .select({
        memberId: schema.orgMemberships.id,
        orgId: schema.orgMemberships.orgId,
        userId: schema.orgMemberships.userId,
        role: schema.orgMemberships.role,
        enabled: schema.orgMemberships.enabled,
        permissions: schema.orgMemberships.permissions,
        userName: schema.users.name,
        userEmail: schema.users.email,
        joinedAt: schema.orgMemberships.joinedAt,
      })
      .from(schema.orgMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.orgMemberships.userId))
      .where(eq(schema.orgMemberships.id, memberId))
      .limit(1);

    if (!row) throw new Error("Member not found after update");
    return MemberMapper.toDomain(row);
  }

  async setEnabled(memberId: string, enabled: boolean): Promise<MemberEntity> {
    await this.db
      .update(schema.orgMemberships)
      .set({ enabled })
      .where(eq(schema.orgMemberships.id, memberId));

    const [row] = await this.db
      .select({
        memberId: schema.orgMemberships.id,
        orgId: schema.orgMemberships.orgId,
        userId: schema.orgMemberships.userId,
        role: schema.orgMemberships.role,
        enabled: schema.orgMemberships.enabled,
        permissions: schema.orgMemberships.permissions,
        userName: schema.users.name,
        userEmail: schema.users.email,
        joinedAt: schema.orgMemberships.joinedAt,
      })
      .from(schema.orgMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.orgMemberships.userId))
      .where(eq(schema.orgMemberships.id, memberId))
      .limit(1);

    if (!row) throw new Error("Member not found after update");
    return MemberMapper.toDomain(row);
  }

  /** Conta owners ativos da org (para impedir desativar/remover o último). */
  async countActiveOwners(orgId: string): Promise<number> {
    const rows = await this.db
      .select({ id: schema.orgMemberships.id })
      .from(schema.orgMemberships)
      .where(
        and(
          eq(schema.orgMemberships.orgId, orgId),
          eq(schema.orgMemberships.role, "owner"),
          eq(schema.orgMemberships.enabled, true),
        ),
      );
    return rows.length;
  }

  /** Orgs em que o usuário é proprietário (qualquer status). */
  async countOwnedOrgs(userId: string): Promise<number> {
    const rows = await this.admin
      .select({ id: schema.orgMemberships.id })
      .from(schema.orgMemberships)
      .where(
        and(
          eq(schema.orgMemberships.userId, userId),
          eq(schema.orgMemberships.role, "owner"),
        ),
      );
    return rows.length;
  }

  async removeAllByUserId(userId: string): Promise<void> {
    await this.admin
      .delete(schema.orgMemberships)
      .where(eq(schema.orgMemberships.userId, userId));
  }

  async transferOwnership(
    orgId: string,
    newOwnerMemberId: string,
    currentOwnerMemberId: string,
    demotedPermissions: string[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Antigo dono → funcionário (mantém acesso via permissions).
      await tx
        .update(schema.orgMemberships)
        .set({ role: "employee", permissions: demotedPermissions })
        .where(
          and(
            eq(schema.orgMemberships.id, currentOwnerMemberId),
            eq(schema.orgMemberships.orgId, orgId),
          ),
        );
      // Novo dono → owner (garante ativo).
      await tx
        .update(schema.orgMemberships)
        .set({ role: "owner", enabled: true })
        .where(
          and(
            eq(schema.orgMemberships.id, newOwnerMemberId),
            eq(schema.orgMemberships.orgId, orgId),
          ),
        );
    });
  }

  async remove(memberId: string): Promise<void> {
    await this.db
      .delete(schema.orgMemberships)
      .where(eq(schema.orgMemberships.id, memberId));
  }
}
