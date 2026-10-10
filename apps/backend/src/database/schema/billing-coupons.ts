import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const billingCoupons = pgTable(
  "billing_coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stripeCouponId: text("stripe_coupon_id").notNull().unique(),
    stripePromotionCodeId: text("stripe_promotion_code_id").unique(),
    code: text("code"),
    name: text("name").notNull(),
    percentOff: integer("percent_off"),
    amountOffCents: integer("amount_off_cents"),
    currency: text("currency"),
    duration: text("duration").notNull(),
    durationInMonths: integer("duration_in_months"),
    maxRedemptions: integer("max_redemptions"),
    timesRedeemed: integer("times_redeemed").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Migration 0094 (ADR-0040): o código só é único entre cupons ATIVOS —
    // o código de um cupom desativado/arquivado pode ser reutilizado.
    uniqueIndex("billing_coupons_code_active_unique")
      .on(t.code)
      .where(sql`${t.active} AND ${t.code} IS NOT NULL`),
  ],
);

export type BillingCoupon = typeof billingCoupons.$inferSelect;
export type NewBillingCoupon = typeof billingCoupons.$inferInsert;
