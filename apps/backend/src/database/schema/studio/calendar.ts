import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  calendarEventTypeEnum,
  calendarEventStatusEnum,
  calendarEventVisibilityEnum,
  calendarAttendeeStatusEnum,
} from "../enums";
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
    // private: só o dono do horário vê; shared: visível para a organização inteira.
    visibility: calendarEventVisibilityEnum("visibility")
      .notNull()
      .default("private"),
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

export const calendarEventAttendees = pgTable(
  "calendar_event_attendees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // going | not_going — "pending" é derivado no DTO (ausência de linha), nunca gravado.
    status: calendarAttendeeStatusEnum("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("calendar_event_attendees_event_user_uq").on(
      t.eventId,
      t.userId,
    ),
  ],
);

export const calendarEventAttendeesRelations = relations(
  calendarEventAttendees,
  ({ one }) => ({
    event: one(calendarEvents, {
      fields: [calendarEventAttendees.eventId],
      references: [calendarEvents.id],
    }),
    user: one(users, {
      fields: [calendarEventAttendees.userId],
      references: [users.id],
    }),
  }),
);

export type CalendarEventAttendee = typeof calendarEventAttendees.$inferSelect;
export type NewCalendarEventAttendee =
  typeof calendarEventAttendees.$inferInsert;
