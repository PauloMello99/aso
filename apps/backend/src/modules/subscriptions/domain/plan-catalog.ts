import type { BillingInterval } from "./subscription.entity";

/**
 * PLAN_CATALOG is SEED data only. It is consulted by SyncPlanCatalogUseCase
 * strictly when there is no row in `billing_plans` (or `billing_plan_prices`)
 * yet for a given plan `key` (first boot / brand-new plan). Once rows exist,
 * `billing_plans`/`billing_plan_prices` are the source of truth for their
 * values (name, price, currency, interval, lookup key, product key,
 * description, metadata) at runtime — the sync no longer overwrites the rows
 * (or rotates the Stripe Price) based on this array.
 * Adding new intervals/prices for an existing plan after the initial seed is
 * done via an explicit super_admin action (future PR), never by editing this
 * file and redeploying.
 */
export interface PlanCatalogPriceEntry {
  interval: BillingInterval;
  priceCents: number;
  currency: string;
  lookupKey: string;
}

export interface PlanCatalogEntry {
  key: string;
  /**
   * Deterministic Stripe Product id (custom id passed to products.create).
   * Makes the boot sync idempotent by id instead of matching on product name.
   */
  productKey: string;
  name: string;
  description?: string;
  prices: PlanCatalogPriceEntry[];
  metadata?: Record<string, string>;
}

export const DEFAULT_PLAN_KEY = "standard";

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    key: "standard",
    productKey: "ink-ops-standard",
    name: "Padrão",
    prices: [
      {
        interval: "monthly",
        priceCents: 40000 /* R$400,00/mês */,
        currency: "brl",
        lookupKey: "ink-ops-standard-monthly",
      },
    ],
  },
];
