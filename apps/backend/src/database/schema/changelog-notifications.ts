import {
  pgTable,
  uuid,
  text,
  timestamp,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { changelogNotificationStatusEnum } from "./enums";

// Log append-only de anúncios de novidades por e-mail (Bloco 5.2 fatia C). Invariantes
// vivem no banco (migration 0082), espelhadas aqui só para tipagem. userId SEM
// .references() por decisão (log histórico; LGPD) — ver cabeçalho da migration 0082.
export const changelogNotifications = pgTable(
  "changelog_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    entryId: text("entry_id").notNull(),
    status: changelogNotificationStatusEnum("status").notNull(),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("changelog_notifications_user_entry_uq").on(t.userId, t.entryId),
    check(
      "changelog_notifications_sent_at_check",
      sql`((${t.status} = 'sent') AND (${t.sentAt} IS NOT NULL) AND (${t.error} IS NULL)) OR ((${t.status} = 'failed') AND (${t.sentAt} IS NULL))`,
    ),
  ],
);

export type ChangelogNotification = typeof changelogNotifications.$inferSelect;
export type NewChangelogNotification =
  typeof changelogNotifications.$inferInsert;
