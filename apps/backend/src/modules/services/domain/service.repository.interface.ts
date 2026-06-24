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
}

export type ServiceStatusFilter = "pending" | "paid" | "canceled";

export interface ListServicesFilter {
  from?: Date;
  to?: Date;
  serviceTypeId?: string;
  customerId?: string;
  /** Restringe ao profissional (funcionário vê só os próprios). */
  performedBy?: string;
  status?: ServiceStatusFilter;
  /** Busca textual (descrição / nome do cliente). */
  q?: string;
}

export interface IServiceRepository {
  create(
    data: CreateServiceData,
    materials: CreateServiceMaterialData[],
  ): Promise<ServiceEntity>;
  /** Detalhe com materiais e nomes anotados. */
  findById(id: string, orgId: string): Promise<ServiceEntity | null>;
  findAllByOrg(
    orgId: string,
    filter?: ListServicesFilter,
  ): Promise<ServiceEntity[]>;
  setPaymentTransaction(id: string, transactionId: string): Promise<void>;
  markCanceled(id: string): Promise<void>;
  update(id: string, data: UpdateServiceData): Promise<ServiceEntity>;
}
