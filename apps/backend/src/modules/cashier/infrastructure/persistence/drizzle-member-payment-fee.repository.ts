import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { MemberPaymentFeeEntity } from "../../domain/member-payment-fee.entity";
import {
  IMemberPaymentFeeRepository,
  UpsertMemberPaymentFeeData,
} from "../../domain/member-payment-fee.repository.interface";
import { PaymentMethod } from "../../domain/transaction.entity";
import { MemberPaymentFeeMapper } from "./member-payment-fee.mapper";

@Injectable()
export class DrizzleMemberPaymentFeeRepository implements IMemberPaymentFeeRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findActiveByOrg(orgId: string): Promise<MemberPaymentFeeEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.orgMemberPaymentFees)
      .where(
        and(
          eq(schema.orgMemberPaymentFees.orgId, orgId),
          eq(schema.orgMemberPaymentFees.active, true),
        ),
      );
    return rows.map(MemberPaymentFeeMapper.toDomain);
  }

  // Leitura pontual usada no caminho de pagamento (calculo da taxa por funcionario
  // na hora do registro). NAO CACHEAR: um valor stale aqui gravaria a fee errada
  // num lancamento append-only, permanentemente, sem chance de correcao automatica.
  async findActiveByOrgUserAndMethod(
    orgId: string,
    userId: string,
    paymentMethod: PaymentMethod,
  ): Promise<MemberPaymentFeeEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.orgMemberPaymentFees)
      .where(
        and(
          eq(schema.orgMemberPaymentFees.orgId, orgId),
          eq(schema.orgMemberPaymentFees.userId, userId),
          eq(schema.orgMemberPaymentFees.paymentMethod, paymentMethod),
          eq(schema.orgMemberPaymentFees.active, true),
        ),
      )
      .limit(1);
    return row ? MemberPaymentFeeMapper.toDomain(row) : null;
  }

  async supersede(
    data: UpsertMemberPaymentFeeData,
  ): Promise<MemberPaymentFeeEntity> {
    const row = await this.db.transaction(async (tx) => {
      // Ordem obrigatoria: o indice unico parcial (org_id, user_id, payment_method)
      // WHERE active so permite uma linha ativa por vez e nao e deferivel, entao a
      // linha antiga precisa ser desativada ANTES do insert da nova.
      await tx
        .update(schema.orgMemberPaymentFees)
        .set({
          active: false,
          supersededAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.orgMemberPaymentFees.orgId, data.orgId),
            eq(schema.orgMemberPaymentFees.userId, data.userId),
            eq(schema.orgMemberPaymentFees.paymentMethod, data.paymentMethod),
            eq(schema.orgMemberPaymentFees.active, true),
          ),
        );

      const [inserted] = await tx
        .insert(schema.orgMemberPaymentFees)
        .values({
          orgId: data.orgId,
          userId: data.userId,
          paymentMethod: data.paymentMethod,
          percent: data.percent,
          fixedCents: data.fixedCents,
          active: true,
          createdBy: data.createdBy,
        })
        .returning();

      return inserted!;
    });

    return MemberPaymentFeeMapper.toDomain(row);
  }

  async deactivate(
    orgId: string,
    userId: string,
    paymentMethod: PaymentMethod,
  ): Promise<void> {
    await this.db
      .update(schema.orgMemberPaymentFees)
      .set({
        active: false,
        supersededAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.orgMemberPaymentFees.orgId, orgId),
          eq(schema.orgMemberPaymentFees.userId, userId),
          eq(schema.orgMemberPaymentFees.paymentMethod, paymentMethod),
          eq(schema.orgMemberPaymentFees.active, true),
        ),
      );
  }
}
