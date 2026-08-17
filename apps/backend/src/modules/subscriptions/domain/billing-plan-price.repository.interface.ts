import type { BillingInterval } from "./subscription.entity";

export const BILLING_PLAN_PRICE_REPOSITORY = Symbol(
  "BILLING_PLAN_PRICE_REPOSITORY",
);

export interface BillingPlanPriceEntity {
  id: string;
  planId: string;
  interval: BillingInterval;
  amountCents: number;
  currency: string;
  stripePriceId: string | null;
  lookupKey: string | null;
  active: boolean;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBillingPlanPriceData {
  planId: string;
  interval: BillingInterval;
  amountCents: number;
  currency: string;
  stripePriceId?: string | null;
  lookupKey?: string | null;
  active?: boolean;
}

export interface IBillingPlanPriceRepository {
  findActiveByPlanId(planId: string): Promise<BillingPlanPriceEntity[]>;
  findAllByPlanId(planId: string): Promise<BillingPlanPriceEntity[]>;
  findActiveByPlanIdAndInterval(
    planId: string,
    interval: BillingInterval,
  ): Promise<BillingPlanPriceEntity | null>;
  /**
   * Busca a linha de preço para (plano, intervalo) independente do status
   * `active` — usado para reativar um intervalo previamente desabilitado
   * (`findActiveByPlanIdAndInterval` só enxerga linhas ativas).
   */
  findByPlanIdAndInterval(
    planId: string,
    interval: BillingInterval,
  ): Promise<BillingPlanPriceEntity | null>;
  findByStripePriceId(
    stripePriceId: string,
  ): Promise<BillingPlanPriceEntity | null>;
  create(data: CreateBillingPlanPriceData): Promise<BillingPlanPriceEntity>;
  updateById(
    id: string,
    data: Partial<Omit<BillingPlanPriceEntity, "id" | "planId" | "createdAt">>,
  ): Promise<BillingPlanPriceEntity>;
  /**
   * Desativa a linha E limpa `lookupKey` numa única operação. Regra da
   * migration 0048: `lookup_key` só é único entre linhas ATIVAS (índice
   * parcial `WHERE active`), então a linha antiga precisa liberar sua
   * lookup_key para uma nova linha (mesmo plan_id/interval, rotação de
   * preço) poder reutilizá-la. Sem isso a criação da nova linha ativa com a
   * mesma lookup_key colidiria com a linha antiga ainda "dona" da chave.
   */
  deactivateById(id: string): Promise<void>;
}
