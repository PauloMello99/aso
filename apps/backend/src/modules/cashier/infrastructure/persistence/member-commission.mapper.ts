import type { OrgMemberCommission as MemberCommissionRow } from "../../../../database/schema/studio/member-commissions";
import { MemberCommissionEntity } from "../../domain/member-commission.entity";
import type { CommissionMode } from "../../domain/member-commission.entity";

export class MemberCommissionMapper {
  static toDomain(row: MemberCommissionRow): MemberCommissionEntity {
    return MemberCommissionEntity.create({
      id: row.id,
      orgId: row.orgId,
      userId: row.userId,
      percent: row.percent,
      mode: row.mode as CommissionMode,
      active: row.active,
      supersededAt: row.supersededAt,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
