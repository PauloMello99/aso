import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const billingPlans = pgTable("billing_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  name: text("name").notNull(),
  description: text("description"),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull(),
  interval: text("interval").notNull(),
  active: boolean("active").notNull().default(true),
  metadata: jsonb("metadata")
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  lookupKey: text("lookup_key"),
  productKey: text("product_key"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BillingPlan = typeof billingPlans.$inferSelect;
export type NewBillingPlan = typeof billingPlans.$inferInsert;
