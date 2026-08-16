import type { BillingInterval } from "./subscription.entity";

/**
 * PLAN_CATALOG is SEED data only. It is consulted by SyncPlanCatalogUseCase
 * strictly when there is no row in `billing_plans` yet for a given `key`
 * (first boot / brand-new plan). Once a row exists, `billing_plans` is the
 * source of truth for its values (name, price, currency, interval, lookup
 * key, product key, description, metadata) at runtime — the sync no longer
 * overwrites the row (or rotates the Stripe Price) based on this array.
 * Editing prices after the initial seed is done via an explicit admin
 * action (future PR), never by editing this file and redeploying.
 */
export interface PlanCatalogEntry {
  key: string;
  /**
   * Deterministic Stripe Product id (custom id passed to products.create).
   * Makes the boot sync idempotent by id instead of matching on product name.
   */
  productKey: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  interval: BillingInterval;
  lookupKey: string;
  metadata?: Record<string, string>;
}

export const DEFAULT_PLAN_KEY = "standard";

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    key: "standard",
    productKey: "ink-ops-standard",
    name: "Padrão",
    priceCents: 40000 /* R$400,00/mês */,
    currency: "brl",
    interval: "monthly",
    lookupKey: "ink-ops-standard-monthly",
  },
];
