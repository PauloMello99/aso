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
  upsert(data: UpsertPaymentFeeData): Promise<PaymentFeeEntity>;
}
