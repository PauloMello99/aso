import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  ticketStatusEnum,
  ticketPriorityEnum,
  ticketAuthorTypeEnum,
} from "../enums";
import { organizations } from "../organizations";
import { users } from "../users";
import { ticketCategories } from "./ticket-categories";

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => ticketCategories.id, { onDelete: "restrict" }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    requesterName: text("requester_name").notNull(),
    requesterEmail: text("requester_email").notNull(),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    status: ticketStatusEnum("status").notNull().default("open"),
    priority: ticketPriorityEnum("priority").notNull().default("normal"),
    assignedAgentId: uuid("assigned_agent_id").references(() => users.id, {
      onDelete: "set null",
    }),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    reopenedAt: timestamp("reopened_at", { withTimezone: true }),
    slaFirstResponseDueAt: timestamp("sla_first_response_due_at", {
      withTimezone: true,
    }).notNull(),
    slaResolutionDueAt: timestamp("sla_resolution_due_at", {
      withTimezone: true,
    }).notNull(),
    slaFirstResponseBreachedAt: timestamp("sla_first_response_breached_at", {
      withTimezone: true,
    }),
    slaResolutionBreachedAt: timestamp("sla_resolution_breached_at", {
      withTimezone: true,
    }),
    slaWarningNotifiedAt: timestamp("sla_warning_notified_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tickets_org_id_status_idx").on(t.orgId, t.status),
    index("tickets_org_id_created_at_idx").on(t.orgId, t.createdAt.desc()),
    index("tickets_sla_first_response_due_at_idx")
      .on(t.slaFirstResponseDueAt)
      .where(
        sql`${t.firstResponseAt} is null and ${t.slaFirstResponseBreachedAt} is null`,
      ),
    // Tickets órfãos (org_id IS NULL) nascem do form público / e-mail-to-ticket
    // (Fatia C) e ficam na fila de triagem do super_admin até serem vinculados
    // a uma organização — este índice suporta a listagem dessa fila.
    index("tickets_orphan_created_at_idx")
      .on(t.createdAt.desc())
      .where(sql`${t.orgId} is null`),
  ],
);

export const ticketResponses = pgTable(
  "ticket_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    authorType: ticketAuthorTypeEnum("author_type").notNull(),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    isInternalNote: boolean("is_internal_note").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ticket_responses_ticket_id_created_at_idx").on(
      t.ticketId,
      t.createdAt,
    ),
  ],
);

export const ticketAttachments = pgTable("ticket_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  responseId: uuid("response_id").references(() => ticketResponses.id, {
    onDelete: "cascade",
  }),
  orgId: uuid("org_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  storagePath: text("storage_path").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tickets.orgId],
    references: [organizations.id],
  }),
  category: one(ticketCategories, {
    fields: [tickets.categoryId],
    references: [ticketCategories.id],
  }),
  createdByUser: one(users, {
    fields: [tickets.createdBy],
    references: [users.id],
  }),
  assignedAgent: one(users, {
    fields: [tickets.assignedAgentId],
    references: [users.id],
  }),
  responses: many(ticketResponses),
  attachments: many(ticketAttachments),
}));

export const ticketResponsesRelations = relations(
  ticketResponses,
  ({ one, many }) => ({
    ticket: one(tickets, {
      fields: [ticketResponses.ticketId],
      references: [tickets.id],
    }),
    organization: one(organizations, {
      fields: [ticketResponses.orgId],
      references: [organizations.id],
    }),
    authorUser: one(users, {
      fields: [ticketResponses.authorUserId],
      references: [users.id],
    }),
    attachments: many(ticketAttachments),
  }),
);

export const ticketAttachmentsRelations = relations(
  ticketAttachments,
  ({ one }) => ({
    ticket: one(tickets, {
      fields: [ticketAttachments.ticketId],
      references: [tickets.id],
    }),
    response: one(ticketResponses, {
      fields: [ticketAttachments.responseId],
      references: [ticketResponses.id],
    }),
    organization: one(organizations, {
      fields: [ticketAttachments.orgId],
      references: [organizations.id],
    }),
    uploadedByUser: one(users, {
      fields: [ticketAttachments.uploadedBy],
      references: [users.id],
    }),
  }),
);

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type TicketResponse = typeof ticketResponses.$inferSelect;
export type NewTicketResponse = typeof ticketResponses.$inferInsert;
export type TicketAttachment = typeof ticketAttachments.$inferSelect;
export type NewTicketAttachment = typeof ticketAttachments.$inferInsert;
