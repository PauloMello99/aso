import {
  pgTable,
  uuid,
  text,
  integer,
  smallint,
  boolean,
  timestamp,
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "../organizations";

// Espelho de leitura da migration 0087 (escrita a mao; o schema nao gera
// migration). user_id/target_user_id sem FK, padrao 0070/0073.
export const quoteForms = pgTable(
  "quote_forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("quote_forms_org_user_uq").on(t.orgId, t.userId),
    unique("quote_forms_slug_uq").on(t.slug),
    unique("quote_forms_id_org_id_uq").on(t.id, t.orgId),
    check(
      "quote_forms_slug_check",
      sql`${t.slug} ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' AND position('--' in ${t.slug}) = 0`,
    ),
    check(
      "quote_forms_display_name_check",
      sql`char_length(btrim(${t.displayName})) BETWEEN 1 AND 80`,
    ),
  ],
);

export const quoteRequests = pgTable(
  "quote_requests",
  {
    // Gerado na aplicacao (sem default): o id compoe o path das imagens no storage.
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    targetUserId: uuid("target_user_id").notNull(),
    requesterName: text("requester_name").notNull(),
    requesterPhone: text("requester_phone").notNull(),
    requesterEmail: text("requester_email").notNull(),
    idea: text("idea").notNull(),
    status: text("status").notNull().default("new"),
    consentVersion: text("consent_version").notNull(),
    consentTextSnapshot: text("consent_text_snapshot").notNull(),
    privacyConsentAcceptedAt: timestamp("privacy_consent_accepted_at", {
      withTimezone: true,
    }).notNull(),
    contactRetentionConsentAcceptedAt: timestamp(
      "contact_retention_consent_accepted_at",
      { withTimezone: true },
    ),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // Migration 0089: null = nao lido. O tenant (app_user) so pode UPDATE desta coluna.
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    // Migration 0091: encerramento + fila de purga (so DRIZZLE_ADMIN escreve purge_*).
    // closed_at e NULL sse status = 'new'.
    closedAt: timestamp("closed_at", { withTimezone: true }),
    purgeRequestedAt: timestamp("purge_requested_at", { withTimezone: true }),
    purgeScope: text("purge_scope"),
    purgeAttempts: integer("purge_attempts").notNull().default(0),
    purgeLastAttemptAt: timestamp("purge_last_attempt_at", {
      withTimezone: true,
    }),
    purgeLastError: text("purge_last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("quote_requests_id_org_id_uq").on(t.id, t.orgId),
    index("quote_requests_purge_pending_idx")
      .on(t.purgeAttempts, t.purgeLastAttemptAt)
      .where(sql`${t.purgeRequestedAt} IS NOT NULL`),
    index("quote_requests_org_created_idx").on(t.orgId, t.createdAt.desc()),
    index("quote_requests_unread_idx")
      .on(t.orgId, t.targetUserId)
      .where(sql`${t.viewedAt} IS NULL`),
    index("quote_requests_org_target_created_idx").on(
      t.orgId,
      t.targetUserId,
      t.createdAt.desc(),
    ),
    index("quote_requests_expires_at_idx").on(t.expiresAt),
    check(
      "quote_requests_requester_name_check",
      sql`char_length(${t.requesterName}) BETWEEN 1 AND 120`,
    ),
    check(
      "quote_requests_requester_phone_check",
      sql`char_length(${t.requesterPhone}) BETWEEN 8 AND 20`,
    ),
    check(
      "quote_requests_requester_email_check",
      sql`char_length(${t.requesterEmail}) BETWEEN 3 AND 254`,
    ),
    check(
      "quote_requests_idea_check",
      sql`char_length(${t.idea}) BETWEEN 1 AND 2000`,
    ),
    check(
      "quote_requests_status_check",
      sql`${t.status} IN ('new','scheduled','not_scheduled')`,
    ),
    check(
      "quote_requests_expires_after_created_check",
      sql`${t.expiresAt} > ${t.createdAt}`,
    ),
    check(
      "quote_requests_closed_at_check",
      sql`(${t.status} = 'new') = (${t.closedAt} IS NULL) AND (${t.closedAt} IS NULL OR ${t.closedAt} >= ${t.createdAt})`,
    ),
    check(
      "quote_requests_retention_window_check",
      sql`${t.expiresAt} <= COALESCE(${t.closedAt}, ${t.createdAt}) + interval '720 hours'`,
    ),
    check(
      "quote_requests_purge_scope_check",
      sql`(${t.purgeRequestedAt} IS NULL) = (${t.purgeScope} IS NULL) AND (${t.purgeScope} IS NULL OR ${t.purgeScope} IN ('all','images'))`,
    ),
    check(
      "quote_requests_purge_images_scope_check",
      sql`${t.purgeScope} IS DISTINCT FROM 'images' OR ${t.status} = 'not_scheduled'`,
    ),
    check(
      "quote_requests_scheduled_purge_check",
      sql`${t.status} <> 'scheduled' OR ${t.purgeScope} IS NOT DISTINCT FROM 'all'`,
    ),
    check(
      "quote_requests_not_scheduled_consent_check",
      sql`${t.status} <> 'not_scheduled' OR ${t.contactRetentionConsentAcceptedAt} IS NOT NULL OR ${t.purgeScope} IS NOT DISTINCT FROM 'all'`,
    ),
    check(
      "quote_requests_purge_attempts_check",
      sql`${t.purgeAttempts} >= 0`,
    ),
    check(
      "quote_requests_purge_last_error_check",
      sql`${t.purgeLastError} IS NULL OR ${t.purgeLastError} ~ '^[A-Za-z0-9_.:-]{1,80}$'`,
    ),
  ],
);

export const quoteRequestImages = pgTable(
  "quote_request_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    // quoteRequestId NAO declara .references() single-column: o vinculo real e
    // uma FK COMPOSTA (quote_request_id, org_id) -> quote_requests(id, org_id)
    // ON DELETE CASCADE, criada via SQL bruto na migration 0087
    // (quote_request_images_request_org_fk). Mesmo padrao de member-payments.ts.
    quoteRequestId: uuid("quote_request_id").notNull(),
    storagePath: text("storage_path").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    position: smallint("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("quote_request_images_storage_path_uq").on(t.storagePath),
    unique("quote_request_images_request_position_uq").on(
      t.quoteRequestId,
      t.position,
    ),
    check(
      "quote_request_images_content_type_check",
      sql`${t.contentType} IN ('image/jpeg','image/png','image/webp','image/heic','image/heif')`,
    ),
    check(
      "quote_request_images_size_check",
      sql`${t.sizeBytes} > 0 AND ${t.sizeBytes} <= 5242880`,
    ),
    check(
      "quote_request_images_position_check",
      sql`${t.position} BETWEEN 0 AND 2`,
    ),
    check(
      "quote_request_images_storage_path_check",
      sql`${t.storagePath} LIKE ${t.orgId}::text || '/' || ${t.quoteRequestId}::text || '/%'`,
    ),
  ],
);

export const quoteFormsRelations = relations(quoteForms, ({ one }) => ({
  organization: one(organizations, {
    fields: [quoteForms.orgId],
    references: [organizations.id],
  }),
}));

export const quoteRequestsRelations = relations(
  quoteRequests,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [quoteRequests.orgId],
      references: [organizations.id],
    }),
    images: many(quoteRequestImages),
  }),
);

export const quoteRequestImagesRelations = relations(
  quoteRequestImages,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [quoteRequestImages.orgId],
      references: [organizations.id],
    }),
    request: one(quoteRequests, {
      fields: [quoteRequestImages.quoteRequestId],
      references: [quoteRequests.id],
    }),
  }),
);

export type QuoteForm = typeof quoteForms.$inferSelect;
export type NewQuoteForm = typeof quoteForms.$inferInsert;
export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type NewQuoteRequest = typeof quoteRequests.$inferInsert;
export type QuoteRequestImage = typeof quoteRequestImages.$inferSelect;
export type NewQuoteRequestImage = typeof quoteRequestImages.$inferInsert;
