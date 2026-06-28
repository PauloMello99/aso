import type { OrgPaymentFee as PaymentFeeRow } from "../../../../database/schema/studio/payment-fees";
import { PaymentFeeEntity } from "../../domain/payment-fee.entity";
import type { PaymentMethod } from "../../domain/transaction.entity";

export class PaymentFeeMapper {
  static toDomain(row: PaymentFeeRow): PaymentFeeEntity {
    return PaymentFeeEntity.create({
      id: row.id,
      orgId: row.orgId,
      paymentMethod: row.paymentMethod as PaymentMethod,
      percent: row.percent,
      fixedCents: row.fixedCents,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
