import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  unique,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { billingPlans } from "./billing-plans";

// Um plano pode ter N preços (um por intervalo de cobrança: monthly/
// semiannual/annual), cada um independentemente editável/habilitável.
// Invariantes vivem no banco (migration 0048), espelhadas aqui só para
// leitura — editar este arquivo NÃO gera/altera a migration já aplicada:
//   - lookup_key NÃO é UNIQUE global: é transferível entre preços numa
//     rotação (transferLookupKey no Stripe). Só a linha ATIVA "possui" a
//     chave (índice parcial WHERE active).
//   - (plan_id, interval) só pode ter 1 linha ATIVA por vez — preços
//     antigos ficam como histórico inativo (o webhook resolve
//     price -> plano por stripe_price_id mesmo para preços arquivados).
export const billingPlanPrices = pgTable(
  "billing_plan_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => billingPlans.id, { onDelete: "cascade" }),
    interval: text("interval").notNull(), // 'monthly' | 'semiannual' | 'annual'
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    stripePriceId: text("stripe_price_id"),
    lookupKey: text("lookup_key"),
    active: boolean("active").notNull().default(true),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("billing_plan_prices_stripe_price_id_unique").on(t.stripePriceId),
    check(
      "billing_plan_prices_interval_check",
      sql`${t.interval} IN ('monthly','semiannual','annual')`,
    ),
    check("billing_plan_prices_amount_cents_check", sql`${t.amountCents} > 0`),
    uniqueIndex("billing_plan_prices_plan_interval_active_uq")
      .on(t.planId, t.interval)
      .where(sql`${t.active}`),
    uniqueIndex("billing_plan_prices_lookup_key_active_uq")
      .on(t.lookupKey)
      .where(sql`${t.active}`),
  ],
);

export type BillingPlanPrice = typeof billingPlanPrices.$inferSelect;
export type NewBillingPlanPrice = typeof billingPlanPrices.$inferInsert;
