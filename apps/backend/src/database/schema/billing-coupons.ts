import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const billingCoupons = pgTable("billing_coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripeCouponId: text("stripe_coupon_id").notNull().unique(),
  stripePromotionCodeId: text("stripe_promotion_code_id").unique(),
  code: text("code").unique(),
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
});

export type BillingCoupon = typeof billingCoupons.$inferSelect;
export type NewBillingCoupon = typeof billingCoupons.$inferInsert;
