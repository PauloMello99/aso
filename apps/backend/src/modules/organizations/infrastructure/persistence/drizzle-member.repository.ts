import { Inject, Injectable } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { IMemberRepository } from "../../domain/member.repository.interface";
import type { MemberEntity } from "../../domain/member.entity";
import type { OrgRole } from "../../domain/org.entity";
import { MemberMapper } from "./member.mapper";

@Injectable()
export class DrizzleMemberRepository implements IMemberRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAllByOrg(orgId: string): Promise<MemberEntity[]> {
    const rows = await this.db
      .select({
        memberId: schema.orgMemberships.id,
        orgId: schema.orgMemberships.orgId,
        userId: schema.orgMemberships.userId,
        role: schema.orgMemberships.role,
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

  async remove(memberId: string): Promise<void> {
    await this.db
      .delete(schema.orgMemberships)
      .where(eq(schema.orgMemberships.id, memberId));
  }
}
