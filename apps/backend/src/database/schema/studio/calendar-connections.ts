import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { calendarProviderEnum } from "../enums";
import { organizations } from "../organizations";

/**
 * Conexão de calendário externo por organização (BL-1). Uma por org.
 * A integração OAuth/sync viva é futura (atrás de feature flag); aqui mora o
 * modelo de dados + o estado da conexão.
 */
export const calendarConnections = pgTable(
  "calendar_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: calendarProviderEnum("provider").notNull(),
    // E-mail/conta externa vinculada (preenchido quando o OAuth real existir).
    externalAccountEmail: text("external_account_email"),
    // users.id de quem conectou.
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
