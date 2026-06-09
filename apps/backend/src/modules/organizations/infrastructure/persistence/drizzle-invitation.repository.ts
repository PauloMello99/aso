import { Inject, Injectable } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { IInvitationRepository, CreateInvitationData } from "../../domain/invitation.repository.interface";
import type { InvitationEntity } from "../../domain/invitation.entity";
import { InvitationMapper } from "./invitation.mapper";

@Injectable()
export class DrizzleInvitationRepository implements IInvitationRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(data: CreateInvitationData): Promise<InvitationEntity> {
    const inserted = await this.db
      .insert(schema.orgInvitations)
      .values({
        orgId: data.orgId,
        invitedBy: data.invitedBy,
        email: data.email,
        role: data.role,
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

  async cancel(id: string): Promise<void> {
    await this.db
      .update(schema.orgInvitations)
      .set({ status: "cancelled" })
      .where(eq(schema.orgInvitations.id, id));
  }
}
