import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { transactionTypeEnum, paymentMethodEnum } from "../enums";
import { organizations } from "../organizations";

// Transactions são agnósticas: não referenciam services.
// É o service que referencia a transaction de pagamento (ver services.ts).
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by"),
  description: text("description").notNull(),
  type: transactionTypeEnum("type").notNull(),
  amountCents: integer("amount_cents").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  transactedAt: timestamp("transacted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  organization: one(organizations, {
    fields: [transactions.orgId],
    references: [organizations.id],
  }),
}));

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
