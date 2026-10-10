import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  calendarEventConfirmationStatusEnum,
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
    assignedTo: uuid("assigned_to")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    type: calendarEventTypeEnum("type").notNull().default("appointment"),
    status: calendarEventStatusEnum("status").notNull().default("scheduled"),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    allDay: boolean("all_day").notNull().default(false),
    visibility: calendarEventVisibilityEnum("visibility")
      .notNull()
      .default("private"),
    customerEmail: text("customer_email"),
    confirmationStatus: calendarEventConfirmationStatusEnum(
      "confirmation_status",
    ),
    confirmationTokenHash: text("confirmation_token_hash"),
    confirmationRequestedAt: timestamp("confirmation_requested_at", {
      withTimezone: true,
    }),
    confirmationSentAt: timestamp("confirmation_sent_at", {
      withTimezone: true,
    }),
    confirmationRespondedAt: timestamp("confirmation_responded_at", {
      withTimezone: true,
    }),
    customerReminderSentAt: timestamp("customer_reminder_sent_at", {
      withTimezone: true,
    }),
    // Origem opaca (pedido de orçamento purgado depois): sem FK de propósito.
    sourceQuoteRequestId: uuid("source_quote_request_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("calendar_events_source_quote_request_uq")
      .on(t.orgId, t.sourceQuoteRequestId)
      .where(sql`${t.sourceQuoteRequestId} IS NOT NULL`),
    index("calendar_events_org_member_starts_idx").on(
      t.orgId,
      t.assignedTo,
      t.startsAt,
    ),
    uniqueIndex("calendar_events_confirmation_token_hash_uq")
      .on(t.confirmationTokenHash)
      .where(sql`${t.confirmationTokenHash} IS NOT NULL`),
    index("calendar_events_customer_reminder_due_idx")
      .on(t.startsAt)
      .where(
        sql`${t.confirmationStatus} = 'pending' AND ${t.customerReminderSentAt} IS NULL`,
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
