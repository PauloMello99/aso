export const BILLING_PLAN_REPOSITORY = Symbol("BILLING_PLAN_REPOSITORY");

export interface BillingPlanEntity {
  id: string;
  key: string;
  stripeProductId: string | null;
  stripePriceId: string | null;
  name: string;
  description: string | null;
  amountCents: number;
  currency: string;
  interval: string;
  active: boolean;
  metadata: Record<string, string>;
  lookupKey: string | null;
  productKey: string | null;
  lastSyncedAt: Date | null;
  highlighted: boolean;
  features: string[];
}

export interface UpsertBillingPlanData {
  key: string;
  stripeProductId?: string | null;
  stripePriceId?: string | null;
  name: string;
  description?: string | null;
  amountCents: number;
  currency: string;
  interval: string;
  active?: boolean;
  metadata?: Record<string, string>;
  lookupKey?: string | null;
  productKey?: string | null;
  lastSyncedAt?: Date | null;
  highlighted?: boolean;
  features?: string[];
}

export interface IBillingPlanRepository {
  findByKey(key: string): Promise<BillingPlanEntity | null>;
  findAll(): Promise<BillingPlanEntity[]>;
  upsert(data: UpsertBillingPlanData): Promise<BillingPlanEntity>;
  findByStripeProductId(productId: string): Promise<BillingPlanEntity | null>;
  findByStripePriceId(priceId: string): Promise<BillingPlanEntity | null>;
  /**
   * Atualiza parcialmente o plano identificado por `key`. Assume que o plano
   * existe — o chamador deve validar previamente (ex.: `findByKey`) e
   * traduzir a ausência em `DomainException`; a implementação não faz esse
   * mapeamento e pode lançar erro não tratado se a key não existir.
   */
  updateByKey(
    key: string,
    data: Partial<UpsertBillingPlanData>,
  ): Promise<BillingPlanEntity>;
}
