import type { OrgMemberPaymentFee as MemberPaymentFeeRow } from "../../../../database/schema/studio/member-payment-fees";
import { MemberPaymentFeeEntity } from "../../domain/member-payment-fee.entity";
import type { PaymentMethod } from "../../domain/transaction.entity";

export class MemberPaymentFeeMapper {
  static toDomain(row: MemberPaymentFeeRow): MemberPaymentFeeEntity {
    return MemberPaymentFeeEntity.create({
      id: row.id,
      orgId: row.orgId,
      userId: row.userId,
      paymentMethod: row.paymentMethod as PaymentMethod,
      percent: row.percent,
      fixedCents: row.fixedCents,
      active: row.active,
      supersededAt: row.supersededAt,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
