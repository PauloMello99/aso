import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  integer,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { transactionTypeEnum, paymentMethodEnum } from "../enums";
import { organizations } from "../organizations";
import { transactionCategories } from "./lookup";
import { orgMemberPaymentFees } from "./member-payment-fees";

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by"),
    description: text("description").notNull(),
    type: transactionTypeEnum("type").notNull(),
    amountCents: integer("amount_cents").notNull(),
    amountGrossCents: integer("amount_gross_cents").notNull().default(0),
    feeCents: integer("fee_cents").notNull().default(0),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    categoryId: uuid("category_id").references(() => transactionCategories.id, {
      onDelete: "set null",
    }),
    feeConfigId: uuid("fee_config_id").references(
      () => orgMemberPaymentFees.id,
      { onDelete: "set null" },
    ),
    feePercent: numeric("fee_percent", { precision: 5, scale: 2 }),
    feeFixedCents: integer("fee_fixed_cents"),
    feeSource: text("fee_source"),
    reversesTransactionId: uuid("reverses_transaction_id").references(
      (): AnyPgColumn => transactions.id,
      { onDelete: "restrict" },
    ),
    transactedAt: timestamp("transacted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("transactions_org_transacted_idx").on(t.orgId, t.transactedAt),
    index("transactions_org_method_idx").on(t.orgId, t.paymentMethod),
    index("transactions_reverses_idx").on(t.reversesTransactionId),
  ],
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  organization: one(organizations, {
    fields: [transactions.orgId],
    references: [organizations.id],
  }),
  reverses: one(transactions, {
    fields: [transactions.reversesTransactionId],
    references: [transactions.id],
    relationName: "reversal",
  }),
}));

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
