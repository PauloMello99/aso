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
  /** Restringe ao profissional (funcionário vê só os próprios). */
  performedBy?: string;
  status?: ServiceStatusFilter;
  paymentMethod?: PaymentMethod;
  /** Faixa de valor (centavos): mínimo inclusivo. */
  minCents?: number;
  /** Faixa de valor (centavos): máximo inclusivo. */
  maxCents?: number;
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
  /** Usado pela guarda do Caixa: impede errata genérica de transação vinculada a serviço. */
  existsByPaymentTransactionId(transactionId: string): Promise<boolean>;
  markCanceled(id: string): Promise<void>;
  /** Sincroniza valor/método/ponteiro de transação após uma errata de pagamento. */
  correctPayment(
    id: string,
    data: { amountCents: number; paymentMethod: PaymentMethod },
    transactionId: string,
  ): Promise<void>;
  update(id: string, data: UpdateServiceData): Promise<ServiceEntity>;
  /**
   * Custo total (em centavos) dos materiais consumidos pelos serviços não
   * cancelados do período (Σ quantity × cost_per_unit). Ignora materiais sem
   * custo cadastrado. Usado pelo dashboard de margem (RPT-3).
   */
  materialCostCentsByPeriod(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<number>;
  /** Serviços não cancelados agrupados por tipo no período (overview). */
  countAndRevenueByType(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<ServiceGroupRow[]>;
  /** Serviços não cancelados agrupados por profissional no período (overview). */
  countAndRevenueByProfessional(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<ServiceGroupRow[]>;
}

/** Linha agregada (por tipo/profissional) para os gráficos do overview. */
export interface ServiceGroupRow {
  name: string;
  count: number;
  revenueCents: number;
}
