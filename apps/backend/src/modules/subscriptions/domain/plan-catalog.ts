import type { BillingInterval } from "./subscription.entity";

export interface PlanCatalogEntry {
  key: string;
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
    name: "Padrão",
    priceCents: 0 /* placeholder — usuário preenche valor real depois */,
    currency: "brl",
    interval: "monthly",
    lookupKey: "ink-ops-standard-monthly",
  },
];
