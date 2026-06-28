import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { calendarEventTypeEnum, calendarEventStatusEnum } from "../enums";
import { organizations } from "../organizations";
import { users } from "../users";
import { customers } from "./customers";

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // O membro (usuário) dono do horário — agenda é sempre de um membro.
    assignedTo: uuid("assigned_to")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    // appointment (com cliente) | unavailability (bloqueio do membro)
    type: calendarEventTypeEnum("type").notNull().default("appointment"),
    status: calendarEventStatusEnum("status").notNull().default("scheduled"),
    // Idempotência do lembrete de agenda (cron): setado ao notificar.
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    allDay: boolean("all_day").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("calendar_events_org_member_starts_idx").on(
      t.orgId,
      t.assignedTo,
      t.startsAt,
    ),
  ],
);

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [calendarEvents.orgId],
    references: [organizations.id],
  }),
  assignee: one(users, {
    fields: [calendarEvents.assignedTo],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [calendarEvents.customerId],
    references: [customers.id],
  }),
}));

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;
