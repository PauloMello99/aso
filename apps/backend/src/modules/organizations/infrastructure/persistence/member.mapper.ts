import { MemberEntity } from "../../domain/member.entity";
import type { OrgRole } from "../../domain/org.entity";

interface MemberRow {
  memberId: string;
  orgId: string;
  userId: string;
  role: string;
  enabled: boolean;
  permissions: string[] | null;
  userName: string;
  userEmail: string;
  joinedAt: Date;
}

export class MemberMapper {
  static toDomain(row: MemberRow): MemberEntity {
    return MemberEntity.create({
      memberId: row.memberId,
      orgId: row.orgId,
      userId: row.userId,
      role: row.role as OrgRole,
      enabled: row.enabled,
      permissions: row.permissions ?? [],
      userName: row.userName,
      userEmail: row.userEmail,
      joinedAt: row.joinedAt,
    });
  }
}
