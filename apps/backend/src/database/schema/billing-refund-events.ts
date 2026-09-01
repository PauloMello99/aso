import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { billingRefundEventStatusEnum } from "./enums";

export const billingRefundEvents = pgTable(
  "billing_refund_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stripeRefundId: text("stripe_refund_id").notNull(),
    stripeChargeId: text("stripe_charge_id"),
    orgId: uuid("org_id"),
    status: billingRefundEventStatusEnum("status").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    reason: text("reason"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("billing_refund_events_refund_status_uq").on(
      t.stripeRefundId,
      t.status,
    ),
    index("billing_refund_events_org_occurred_idx").on(
      t.orgId,
      t.occurredAt.desc(),
    ),
    // Backs the charge-keyed reads (findResolvedOrgIdByChargeId,
    // resolveOrgIdWhereNull); added out-of-band in migration 0064.
    index("billing_refund_events_charge_idx").on(t.stripeChargeId),
  ],
);

export type BillingRefundEvent = typeof billingRefundEvents.$inferSelect;
export type NewBillingRefundEvent = typeof billingRefundEvents.$inferInsert;
