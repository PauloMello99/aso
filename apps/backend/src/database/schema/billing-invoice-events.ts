import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { billingInvoiceEventTypeEnum } from "./enums";

export const billingInvoiceEvents = pgTable(
  "billing_invoice_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stripeInvoiceId: text("stripe_invoice_id").notNull(),
    orgId: uuid("org_id"),
    type: billingInvoiceEventTypeEnum("type").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("billing_invoice_events_invoice_type_uq").on(
      t.stripeInvoiceId,
      t.type,
    ),
  ],
);

export type BillingInvoiceEvent = typeof billingInvoiceEvents.$inferSelect;
export type NewBillingInvoiceEvent = typeof billingInvoiceEvents.$inferInsert;
