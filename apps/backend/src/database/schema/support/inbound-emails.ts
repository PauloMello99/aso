import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tickets, ticketResponses } from "./tickets";

// Tabela de dedupe do webhook de e-mail recebido (Resend pode reenviar o mesmo
// evento em retry). O handler tenta "reivindicar" o email_id via
// INSERT ... ON CONFLICT (email_id) DO NOTHING antes de qualquer lógica de
// negócio — se a linha já existe, o evento já foi processado e é ignorado.
// Tabela puramente de infraestrutura: RLS habilitada sem nenhuma policy
// (deny-by-default), só DRIZZLE_ADMIN/service_role acessa. Ver 0045.
export const supportInboundEmails = pgTable(
  "support_inbound_emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailId: text("email_id").notNull().unique(),
    messageId: text("message_id"),
    fromEmail: text("from_email").notNull(),
    toEmail: text("to_email").notNull(),
    ticketId: uuid("ticket_id").references(() => tickets.id, {
      onDelete: "set null",
    }),
    responseId: uuid("response_id").references(() => ticketResponses.id, {
      onDelete: "set null",
    }),
    outcome: text("outcome"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [index("support_inbound_emails_ticket_id_idx").on(t.ticketId)],
);

// Relação unidirecional (só o lado "many-to-one" desta tabela): não adiciona
// `many(supportInboundEmails)` em tickets/ticketResponses (fora do escopo desta
// migration, tickets.ts não foi tocado).
export const supportInboundEmailsRelations = relations(
  supportInboundEmails,
  ({ one }) => ({
    ticket: one(tickets, {
      fields: [supportInboundEmails.ticketId],
      references: [tickets.id],
    }),
    response: one(ticketResponses, {
      fields: [supportInboundEmails.responseId],
      references: [ticketResponses.id],
    }),
  }),
);

export type SupportInboundEmail = typeof supportInboundEmails.$inferSelect;
export type NewSupportInboundEmail = typeof supportInboundEmails.$inferInsert;
