import type { PaymentMethod } from "../../cashier/domain/transaction.entity";
import type { ServiceMaterialEntity } from "./service-material.entity";

export type { PaymentMethod };

/** Estado derivado do serviço (não é coluna). */
export type ServiceStatus = "pending" | "paid" | "canceled";

export interface ServiceEntityProps {
  id: string;
  orgId: string;
  serviceTypeId: string | null;
  customerId: string | null;
  /** Transação de pagamento vinculada (null = pendente). */
  paymentTransactionId: string | null;
  performedBy: string | null;
  createdBy: string | null;
  description: string | null;
  /** Valor bruto lançado, em centavos. */
  amountCents: number;
  paymentMethod: PaymentMethod;
  performedAt: Date;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Anotações de leitura (joins) — não persistidas pela própria entidade.
  materials?: ServiceMaterialEntity[];
  customerName?: string | null;
  employeeName?: string | null;
  typeName?: string | null;
}

export class ServiceEntity {
  readonly id: string;
  readonly orgId: string;
  readonly serviceTypeId: string | null;
  readonly customerId: string | null;
  readonly paymentTransactionId: string | null;
  readonly performedBy: string | null;
  readonly createdBy: string | null;
  readonly description: string | null;
  readonly amountCents: number;
  readonly paymentMethod: PaymentMethod;
  readonly performedAt: Date;
  readonly canceledAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly materials: ServiceMaterialEntity[];
  readonly customerName: string | null;
  readonly employeeName: string | null;
  readonly typeName: string | null;

  private constructor(props: ServiceEntityProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.serviceTypeId = props.serviceTypeId;
    this.customerId = props.customerId;
    this.paymentTransactionId = props.paymentTransactionId;
    this.performedBy = props.performedBy;
    this.createdBy = props.createdBy;
    this.description = props.description;
    this.amountCents = props.amountCents;
    this.paymentMethod = props.paymentMethod;
    this.performedAt = props.performedAt;
    this.canceledAt = props.canceledAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.materials = props.materials ?? [];
    this.customerName = props.customerName ?? null;
    this.employeeName = props.employeeName ?? null;
    this.typeName = props.typeName ?? null;
  }

  static create(props: ServiceEntityProps): ServiceEntity {
    return new ServiceEntity(props);
  }

  get isCanceled(): boolean {
    return this.canceledAt !== null;
  }

  get isPaid(): boolean {
    return !this.isCanceled && this.paymentTransactionId !== null;
  }

  get status(): ServiceStatus {
    if (this.isCanceled) return "canceled";
    return this.paymentTransactionId !== null ? "paid" : "pending";
  }
}
