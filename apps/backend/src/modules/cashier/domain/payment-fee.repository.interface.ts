import type { PaymentFeeEntity } from "./payment-fee.entity";
import type { PaymentMethod } from "./transaction.entity";

export const PAYMENT_FEE_REPOSITORY = Symbol("PAYMENT_FEE_REPOSITORY");

export interface UpsertPaymentFeeData {
  orgId: string;
  paymentMethod: PaymentMethod;
  percent: string;
  fixedCents: number;
}

export interface IPaymentFeeRepository {
  findByOrg(orgId: string): Promise<PaymentFeeEntity[]>;
  findByOrgAndMethod(
    orgId: string,
    method: PaymentMethod,
  ): Promise<PaymentFeeEntity | null>;
  /** Cria ou atualiza a taxa do método (UNIQUE org_id+payment_method). */
  upsert(data: UpsertPaymentFeeData): Promise<PaymentFeeEntity>;
}
