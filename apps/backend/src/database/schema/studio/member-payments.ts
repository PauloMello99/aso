import {
  pgTable,
  uuid,
  integer,
  date,
  text,
  timestamp,
  uniqueIndex,
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "../organizations";
import { transactions } from "./transactions";

export const orgMemberPayments = pgTable(
  "org_member_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    // transactionId NAO declara .references() single-column: o vinculo real e
    // uma FK COMPOSTA (transaction_id, org_id) -> transactions(id, org_id)
    // ON DELETE RESTRICT, criada via SQL bruto na migration 0072
    // (org_member_payments_transaction_org_fk) — garante que a transacao
    // pertence a esta mesma org (achado medium do database-guardian). Drizzle
    // nao expressa FK composta no builder de coluna; o projeto nao roda
    // drizzle-kit generate desde a migration 0003 (ver
    // drizzle/migrations/README.md), entao essa e uma divergencia cosmetica
    // aceita (mesmo padrao de customer-self-service.ts).
    transactionId: uuid("transaction_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    description: text("description"),
    // reversesPaymentId NAO declara .references() single-column: o vinculo
    // real e uma FK COMPOSTA (reverses_payment_id, org_id) ->
    // org_member_payments(id, org_id) ON DELETE RESTRICT, criada via SQL
    // bruto na migration 0072 (org_member_payments_reverses_org_fk) — mesma
    // justificativa de transactionId acima.
    reversesPaymentId: uuid("reverses_payment_id"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Base para a FK composta (transaction_id, org_id) de
    // org_member_payments_transaction_org_fk e (reverses_payment_id, org_id)
    // de org_member_payments_reverses_org_fk (migration 0072) — garante no
    // banco que um pagamento so referencia transacao/estorno da PROPRIA org.
    unique("org_member_payments_id_org_id_uq").on(t.id, t.orgId),
    uniqueIndex("org_member_payments_transaction_uq").on(t.transactionId),
    uniqueIndex("org_member_payments_reverses_uq")
      .on(t.reversesPaymentId)
      .where(sql`${t.reversesPaymentId} IS NOT NULL`),
    index("org_member_payments_org_user_idx").on(t.orgId, t.userId),
    check("org_member_payments_amount_cents_check", sql`${t.amountCents} > 0`),
    check(
      "org_member_payments_period_check",
      sql`${t.periodStart} IS NULL OR ${t.periodEnd} IS NULL OR ${t.periodStart} <= ${t.periodEnd}`,
    ),
    check(
      "org_member_payments_reverses_not_self_check",
      sql`${t.reversesPaymentId} IS NULL OR ${t.reversesPaymentId} <> ${t.id}`,
    ),
  ],
);

export const orgMemberPaymentsRelations = relations(
  orgMemberPayments,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [orgMemberPayments.orgId],
      references: [organizations.id],
    }),
    transaction: one(transactions, {
      fields: [orgMemberPayments.transactionId],
      references: [transactions.id],
    }),
    reverses: one(orgMemberPayments, {
      fields: [orgMemberPayments.reversesPaymentId],
      references: [orgMemberPayments.id],
      relationName: "reversal",
    }),
  }),
);

export type OrgMemberPayment = typeof orgMemberPayments.$inferSelect;
export type NewOrgMemberPayment = typeof orgMemberPayments.$inferInsert;
