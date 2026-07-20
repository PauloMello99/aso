import { Inject, Injectable } from "@nestjs/common";
import { eq, and, sql } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  IInvitationRepository,
  CreateInvitationData,
  InvitationWithOrg,
} from "../../domain/invitation.repository.interface";
import type { InvitationEntity } from "../../domain/invitation.entity";
import { InvitationMapper } from "./invitation.mapper";

@Injectable()
export class DrizzleInvitationRepository implements IInvitationRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async create(data: CreateInvitationData): Promise<InvitationEntity> {
    const inserted = await this.db
      .insert(schema.orgInvitations)
      .values({
        orgId: data.orgId,
        invitedBy: data.invitedBy,
        email: data.email,
        role: data.role,
      })
      .onConflictDoUpdate({
        target: [schema.orgInvitations.orgId, schema.orgInvitations.email],
        set: {
          invitedBy: data.invitedBy,
          role: data.role,
          status: "pending",
          token: sql`replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')`,
          expiresAt: sql`now() + interval '7 days'`,
          acceptedAt: null,
        },
      })
      .returning();

    const row = inserted[0];
    if (!row) throw new Error("Failed to create invitation");
    return InvitationMapper.toDomain(row);
  }

  async findPendingByOrg(orgId: string): Promise<InvitationEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.orgInvitations)
      .where(
        and(
          eq(schema.orgInvitations.orgId, orgId),
          eq(schema.orgInvitations.status, "pending"),
        ),
      );

    return rows.map(InvitationMapper.toDomain);
  }

  async findById(id: string, orgId: string): Promise<InvitationEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.orgInvitations)
      .where(
        and(
          eq(schema.orgInvitations.id, id),
          eq(schema.orgInvitations.orgId, orgId),
        ),
      )
      .limit(1);

    return row ? InvitationMapper.toDomain(row) : null;
  }

  async findByToken(token: string): Promise<InvitationWithOrg | null> {
    const [row] = await this.admin
      .select({
        invitation: schema.orgInvitations,
        orgName: schema.organizations.name,
        orgSlug: schema.organizations.slug,
      })
      .from(schema.orgInvitations)
      .innerJoin(
        schema.organizations,
        eq(schema.organizations.id, schema.orgInvitations.orgId),
      )
      .where(eq(schema.orgInvitations.token, token))
      .limit(1);

    if (!row) return null;
    return {
      invitation: InvitationMapper.toDomain(row.invitation),
      orgName: row.orgName,
      orgSlug: row.orgSlug,
    };
  }

  async markAccepted(id: string): Promise<void> {
    await this.admin
      .update(schema.orgInvitations)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(schema.orgInvitations.id, id));
  }

  async cancel(id: string): Promise<void> {
    await this.db
      .update(schema.orgInvitations)
      .set({ status: "cancelled" })
      .where(eq(schema.orgInvitations.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.admin
      .delete(schema.orgInvitations)
      .where(eq(schema.orgInvitations.id, id));
  }
}
