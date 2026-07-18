import {
  pgTable,
  uuid,
  integer,
  numeric,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { paymentMethodEnum } from "../enums";
import { organizations } from "../organizations";

export const orgPaymentFees = pgTable(
  "org_payment_fees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    percent: numeric("percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    fixedCents: integer("fixed_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("org_payment_fees_org_method_uq").on(t.orgId, t.paymentMethod)],
);

export const orgPaymentFeesRelations = relations(orgPaymentFees, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgPaymentFees.orgId],
    references: [organizations.id],
  }),
}));

export type OrgPaymentFee = typeof orgPaymentFees.$inferSelect;
export type NewOrgPaymentFee = typeof orgPaymentFees.$inferInsert;
