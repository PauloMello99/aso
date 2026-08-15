import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const ticketCategories = pgTable("ticket_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  systemKey: text("system_key").unique().notNull(),
  label: text("label").notNull(),
  slaFirstResponseMinutes: integer("sla_first_response_minutes").notNull(),
  slaResolutionMinutes: integer("sla_resolution_minutes").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TicketCategory = typeof ticketCategories.$inferSelect;
export type NewTicketCategory = typeof ticketCategories.$inferInsert;
