import type { OrgMemberPayment as MemberPaymentRow } from "../../../../database/schema/studio/member-payments";
import { MemberPaymentEntity } from "../../domain/member-payment.entity";

export class MemberPaymentMapper {
  static toDomain(row: MemberPaymentRow): MemberPaymentEntity {
    return MemberPaymentEntity.create({
      id: row.id,
      orgId: row.orgId,
      userId: row.userId,
      transactionId: row.transactionId,
      amountCents: row.amountCents,
      // periodStart/periodEnd sao date(...) sem { mode: "date" } — o Drizzle
      // infere string (YYYY-MM-DD), nao Date (ver comentario load-bearing em
      // member-payment.entity.ts). Nao converter aqui.
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      description: row.description,
      reversesPaymentId: row.reversesPaymentId,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    });
  }
}
