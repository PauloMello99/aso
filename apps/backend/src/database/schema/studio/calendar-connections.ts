import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { calendarProviderEnum } from "../enums";
import { organizations } from "../organizations";

export const calendarConnections = pgTable(
  "calendar_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: calendarProviderEnum("provider").notNull(),
    externalAccountEmail: text("external_account_email"),
    connectedBy: uuid("connected_by"),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("calendar_connections_org_id_unique").on(t.orgId)],
);

export const calendarConnectionsRelations = relations(
  calendarConnections,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [calendarConnections.orgId],
      references: [organizations.id],
    }),
  }),
);

export type CalendarConnection = typeof calendarConnections.$inferSelect;
export type NewCalendarConnection = typeof calendarConnections.$inferInsert;
