import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { transactionTypeEnum, paymentMethodEnum } from "../enums";
import { organizations } from "../organizations";
import { transactionCategories } from "./lookup";

// Transactions são agnósticas: não referenciam services.
// É o service que referencia a transaction de pagamento (ver services.ts).
//
// Append-only por design (ver RLS em 0000: members só SELECT/INSERT). Correções
// NÃO editam a linha — entram como um ESTORNO: uma nova transação de tipo oposto
// que aponta para a original via `reverses_transaction_id`. "Estornada" é
// derivado (existe uma linha que a estorna), nunca um campo mutável.
//
// Valores em centavos, divididos em bruto/taxa/líquido (decisão reunião 11/06):
//   amount_gross_cents  = valor cheio lançado
//   fee_cents           = taxa aplicada (ex.: maquininha de cartão)
//   amount_cents        = LÍQUIDO (gross - fee) — é o que o CAIXA reflete
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
    // Líquido — o que o caixa reflete.
    amountCents: integer("amount_cents").notNull(),
    amountGrossCents: integer("amount_gross_cents").notNull().default(0),
    feeCents: integer("fee_cents").notNull().default(0),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    // Categoria (opcional) para padronizar/relatar; a descrição permanece.
    categoryId: uuid("category_id").references(() => transactionCategories.id, {
      onDelete: "set null",
    }),
    // Quando preenchido, esta linha é o estorno da transação referenciada.
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
