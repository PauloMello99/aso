import type { PaymentMethod, ServiceEntity } from "./service.entity";

export const SERVICE_REPOSITORY = Symbol("SERVICE_REPOSITORY");

export interface CreateServiceData {
  orgId: string;
  serviceTypeId?: string | null;
  customerId?: string | null;
  performedBy?: string | null;
  createdBy?: string | null;
  description?: string | null;
  amountCents: number;
  paymentMethod: PaymentMethod;
  performedAt?: Date;
  anamnesisResponseId?: string | null;
}

export interface CreateServiceMaterialData {
  materialId: string;
  quantity: string;
}

export interface UpdateServiceData {
  serviceTypeId?: string | null;
  customerId?: string | null;
  performedBy?: string | null;
  description?: string | null;
  performedAt?: Date;
  anamnesisResponseId?: string | null;
}

export type ServiceStatusFilter = "pending" | "paid" | "canceled";

export interface ListServicesFilter {
  from?: Date;
  to?: Date;
  serviceTypeId?: string;
  customerId?: string;
  performedBy?: string;
  status?: ServiceStatusFilter;
  paymentMethod?: PaymentMethod;
  minCents?: number;
  maxCents?: number;
  q?: string;
}

export interface IServiceRepository {
  create(
    data: CreateServiceData,
    materials: CreateServiceMaterialData[],
  ): Promise<ServiceEntity>;
  findById(id: string, orgId: string): Promise<ServiceEntity | null>;
  findAllByOrg(
    orgId: string,
    filter?: ListServicesFilter,
  ): Promise<ServiceEntity[]>;
  setPaymentTransaction(id: string, transactionId: string): Promise<void>;
  existsByPaymentTransactionId(transactionId: string): Promise<boolean>;
  markCanceled(id: string): Promise<void>;
  correctPayment(
    id: string,
    data: { amountCents: number; paymentMethod: PaymentMethod },
    transactionId: string,
  ): Promise<void>;
  update(id: string, data: UpdateServiceData): Promise<ServiceEntity>;
  materialCostCentsByPeriod(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<number>;
  countAndRevenueByType(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<ServiceGroupRow[]>;
  countAndRevenueByProfessional(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<ServiceGroupRow[]>;
}

export interface ServiceGroupRow {
  name: string;
  count: number;
  revenueCents: number;
}
