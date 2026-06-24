import type { PaymentMethod } from "./transaction.entity";

export interface PaymentFeeEntityProps {
  id: string;
  orgId: string;
  paymentMethod: PaymentMethod;
  /** Percentual (ex.: "10.00" = 10%). String numérica do DB. */
  percent: string;
  /** Parcela fixa em centavos. */
  fixedCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PaymentFeeEntity {
  readonly id: string;
  readonly orgId: string;
  readonly paymentMethod: PaymentMethod;
  readonly percent: string;
  readonly fixedCents: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: PaymentFeeEntityProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.paymentMethod = props.paymentMethod;
    this.percent = props.percent;
    this.fixedCents = props.fixedCents;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: PaymentFeeEntityProps): PaymentFeeEntity {
    return new PaymentFeeEntity(props);
  }
}
