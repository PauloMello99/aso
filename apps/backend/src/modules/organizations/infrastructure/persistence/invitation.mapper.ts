import { InvitationEntity, type InvitationStatus } from "../../domain/invitation.entity";
import type { OrgRole } from "../../domain/org.entity";

interface InvitationRow {
  id: string;
  orgId: string;
  invitedBy: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}

export class InvitationMapper {
  static toDomain(row: InvitationRow): InvitationEntity {
    return InvitationEntity.create({
      id: row.id,
      orgId: row.orgId,
      invitedBy: row.invitedBy,
      email: row.email,
      role: row.role as OrgRole,
      status: row.status as InvitationStatus,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    });
  }
}
