import type { Transaction as TransactionRow } from "../../../../database/schema/studio/transactions";
import type { FeeSource } from "../../domain/fee-calculator";
import {
  PaymentMethod,
  TransactionEntity,
  TransactionType,
} from "../../domain/transaction.entity";

export class TransactionMapper {
  static toDomain(row: TransactionRow): TransactionEntity {
    return TransactionEntity.create({
      id: row.id,
      orgId: row.orgId,
      createdBy: row.createdBy ?? null,
      description: row.description,
      type: row.type as TransactionType,
      netCents: row.amountCents,
      grossCents: row.amountGrossCents,
      feeCents: row.feeCents,
      paymentMethod: row.paymentMethod as PaymentMethod,
      categoryId: row.categoryId ?? null,
      feeConfigId: row.feeConfigId ?? null,
      feePercent: row.feePercent ?? null,
      feeFixedCents: row.feeFixedCents ?? null,
      feeSource: row.feeSource as FeeSource | null,
      reversesTransactionId: row.reversesTransactionId ?? null,
      transactedAt: row.transactedAt,
      createdAt: row.createdAt,
    });
  }
}
