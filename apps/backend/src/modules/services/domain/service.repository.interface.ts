import type { CommissionMode } from "../../cashier/domain/member-commission.entity";
import type { PaymentMethod, ServiceEntity } from "./service.entity";

export const SERVICE_REPOSITORY = Symbol("SERVICE_REPOSITORY");

/**
 * Snapshot desnormalizado da comissao do profissional gravado na MESMA
 * operacao que grava payment_transaction_id (setPaymentTransaction /
 * correctPayment). Nunca escrever payment_transaction_id sem este snapshot:
 * o trigger de banco so libera a alteracao dessas colunas para nao-owner
 * enquanto payment_transaction_id ainda for NULL (ver migration
 * 0051_member_commissions). Sem config ativa, zerar explicitamente
 * (configId/percent/mode null, baseCents/commissionCents 0) em vez de pular
 * a escrita.
 */
export interface CommissionSnapshot {
  configId: string | null;
  percent: string | null;
  mode: CommissionMode | null;
  baseCents: number;
  commissionCents: number;
}

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
  setPaymentTransaction(
    id: string,
    transactionId: string,
    commission: CommissionSnapshot,
  ): Promise<void>;
  existsByPaymentTransactionId(transactionId: string): Promise<boolean>;
  /**
   * Retorna o mapeamento transactionId -> serviceId para as transações de
   * PAGAMENTO informadas (services.payment_transaction_id). Transações sem
   * serviço vinculado simplesmente não aparecem no Map retornado.
   */
  findServiceIdsByTransactionIds(
    orgId: string,
    transactionIds: string[],
  ): Promise<Map<string, string>>;
  markCanceled(id: string): Promise<void>;
  correctPayment(
    id: string,
    data: { amountCents: number; paymentMethod: PaymentMethod },
    transactionId: string,
    commission: CommissionSnapshot,
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
  /**
   * Soma commission_cents no periodo. `performedBy` e obrigatorio (nao opcional)
   * para forcar todo caller a decidir explicitamente o escopo: `null` agrega a
   * ORG INTEIRA (dado sensivel, só o ramo owner deve passar isso), uma string
   * escopa a UM profissional (ramo employee). Uma assinatura com parametro
   * opcional permitiria "esquecer" o escopo e vazar comissao de toda a org por
   * omissao — ver achado do database-guardian na revisão do passo 8.
   */
  commissionCentsByPeriod(
    orgId: string,
    from: Date,
    to: Date,
    performedBy: string | null,
  ): Promise<number>;
}

export interface ServiceGroupRow {
  name: string;
  count: number;
  revenueCents: number;
  commissionCents: number;
}
