export const BILLING_PLAN_REPOSITORY = Symbol("BILLING_PLAN_REPOSITORY");

export interface BillingPlanEntity {
  id: string;
  key: string;
  stripeProductId: string | null;
  stripePriceId: string | null;
  name: string;
  amountCents: number;
  currency: string;
  interval: string;
  active: boolean;
  lastSyncedAt: Date | null;
}

export interface UpsertBillingPlanData {
  key: string;
  stripeProductId?: string | null;
  stripePriceId?: string | null;
  name: string;
  amountCents: number;
  currency: string;
  interval: string;
  active?: boolean;
  lastSyncedAt?: Date | null;
}

export interface IBillingPlanRepository {
  findByKey(key: string): Promise<BillingPlanEntity | null>;
  findAll(): Promise<BillingPlanEntity[]>;
  upsert(data: UpsertBillingPlanData): Promise<BillingPlanEntity>;
}
