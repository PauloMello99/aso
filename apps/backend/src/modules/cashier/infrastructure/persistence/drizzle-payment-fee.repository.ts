import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { PaymentFeeEntity } from "../../domain/payment-fee.entity";
import { PaymentMethod } from "../../domain/transaction.entity";
import {
  IPaymentFeeRepository,
  UpsertPaymentFeeData,
} from "../../domain/payment-fee.repository.interface";
import { PaymentFeeMapper } from "./payment-fee.mapper";

@Injectable()
export class DrizzlePaymentFeeRepository implements IPaymentFeeRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByOrg(orgId: string): Promise<PaymentFeeEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.orgPaymentFees)
      .where(eq(schema.orgPaymentFees.orgId, orgId));
    return rows.map(PaymentFeeMapper.toDomain);
  }

  async findByOrgAndMethod(
    orgId: string,
    method: PaymentMethod,
  ): Promise<PaymentFeeEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.orgPaymentFees)
      .where(
        and(
          eq(schema.orgPaymentFees.orgId, orgId),
          eq(schema.orgPaymentFees.paymentMethod, method),
        ),
      )
      .limit(1);
    return row ? PaymentFeeMapper.toDomain(row) : null;
  }

  async upsert(data: UpsertPaymentFeeData): Promise<PaymentFeeEntity> {
    const [row] = await this.db
      .insert(schema.orgPaymentFees)
      .values({
        orgId: data.orgId,
        paymentMethod: data.paymentMethod,
        percent: data.percent,
        fixedCents: data.fixedCents,
      })
      .onConflictDoUpdate({
        target: [
          schema.orgPaymentFees.orgId,
          schema.orgPaymentFees.paymentMethod,
        ],
        set: {
          percent: data.percent,
          fixedCents: data.fixedCents,
          updatedAt: new Date(),
        },
      })
      .returning();
    return PaymentFeeMapper.toDomain(row!);
  }
}
