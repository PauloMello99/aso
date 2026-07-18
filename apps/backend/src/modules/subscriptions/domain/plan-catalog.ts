import type { BillingInterval } from "./subscription.entity";

export interface PlanCatalogEntry {
  key: string;
  /**
   * Deterministic Stripe Product id (custom id passed to products.create).
   * Makes the boot sync idempotent by id instead of matching on product name.
   */
  productKey: string;
  name: string;
  priceCents: number;
  currency: string;
  interval: BillingInterval;
  lookupKey: string;
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
