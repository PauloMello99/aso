import type { MemberPaymentFeeEntity } from "./member-payment-fee.entity";
import type { PaymentMethod } from "./transaction.entity";

export const MEMBER_PAYMENT_FEE_REPOSITORY = Symbol(
  "MEMBER_PAYMENT_FEE_REPOSITORY",
);

export interface UpsertMemberPaymentFeeData {
  orgId: string;
  userId: string;
  paymentMethod: PaymentMethod;
  percent: string;
  fixedCents: number;
  createdBy: string | null;
}

export interface IMemberPaymentFeeRepository {
  findActiveByOrg(orgId: string): Promise<MemberPaymentFeeEntity[]>;
  findActiveByOrgUserAndMethod(
    orgId: string,
    userId: string,
    paymentMethod: PaymentMethod,
  ): Promise<MemberPaymentFeeEntity | null>;
  supersede(data: UpsertMemberPaymentFeeData): Promise<MemberPaymentFeeEntity>;
  /**
   * Desativa o override ativo de (orgId, userId, paymentMethod), se houver — volta
   * ao fallback da taxa da org. Idempotente: no-op se não houver linha ativa.
   * Nunca deleta.
   */
  deactivate(
    orgId: string,
    userId: string,
    paymentMethod: PaymentMethod,
  ): Promise<void>;
}
