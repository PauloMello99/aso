import type { PaymentMethod } from "./transaction.entity";

export interface MemberPaymentFeeEntityProps {
  id: string;
  orgId: string;
  userId: string;
  paymentMethod: PaymentMethod;
  percent: string;
  fixedCents: number;
  installments: number;
  active: boolean;
  supersededAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class MemberPaymentFeeEntity {
  readonly id: string;
  readonly orgId: string;
  readonly userId: string;
  readonly paymentMethod: PaymentMethod;
  readonly percent: string;
  readonly fixedCents: number;
  readonly installments: number;
  readonly active: boolean;
  readonly supersededAt: Date | null;
  readonly createdBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: MemberPaymentFeeEntityProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.userId = props.userId;
    this.paymentMethod = props.paymentMethod;
    this.percent = props.percent;
    this.fixedCents = props.fixedCents;
    this.installments = props.installments;
    this.active = props.active;
    this.supersededAt = props.supersededAt;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: MemberPaymentFeeEntityProps): MemberPaymentFeeEntity {
    return new MemberPaymentFeeEntity(props);
  }
}
