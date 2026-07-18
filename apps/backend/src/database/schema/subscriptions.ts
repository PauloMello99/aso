import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  smallint,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  subscriptionTypeEnum,
  subscriptionStatusEnum,
  billingIntervalEnum,
} from "./enums";
import { organizations } from "./organizations";
import { users } from "./users";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .unique()
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  type: subscriptionTypeEnum("type").notNull().default("trial"),
  status: subscriptionStatusEnum("status").notNull().default("trialing"),
  billingInterval: billingIntervalEnum("billing_interval"),
  priceCents: integer("price_cents"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodStart: timestamp("current_period_start", {
    withTimezone: true,
  }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  gracePeriodDays: integer("grace_period_days").notNull().default(14),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  stripePriceId: text("stripe_price_id"),
  stripeCouponId: text("stripe_coupon_id"),
  discountPercent: smallint("discount_percent"),
  compReason: text("comp_reason"),
  compGrantedBy: uuid("comp_granted_by").references(() => users.id, {
    onDelete: "set null",
  }),
  compExpiresAt: timestamp("comp_expires_at", { withTimezone: true }),
  trialConsumed: boolean("trial_consumed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.orgId],
    references: [organizations.id],
  }),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
