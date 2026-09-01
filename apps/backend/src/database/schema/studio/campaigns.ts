import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { campaignSendStatusEnum, campaignTriggerTypeEnum } from "../enums";
import { organizations } from "../organizations";
import { customers } from "./customers";

// Módulo de campanhas de e-mail por gatilho (T6 Bloco A). Invariantes vivem no
// banco (migrations 0061/0062/0063), espelhadas aqui só para leitura — editar
// este arquivo NÃO gera/altera as migrations já aplicadas.
//
//   - customer_email_preferences: opt-out por cliente. Ausência de linha = cliente
//     não optou por sair de nada. "unsubscribe_token" é gerado só pelo DEFAULT do
//     banco e NUNCA rotaciona (viaja em links de e-mails já entregues — LGPD).
//   - org_campaign_settings: liga/desliga + copy custom por gatilho, por org.
//     Ausência de linha = campanhas desligadas (queries de gatilho fazem INNER
//     JOIN, nunca LEFT). Colunas de texto NULL = usa o default autoral do produto.
//   - campaign_sends: log append-only PURO (D2, espírito do ADR-0010). UMA LINHA
//     POR (tentativa, status terminal), nunca UPDATE/DELETE. "dedupe_key" é o
//     contrato de idempotência. Sem FK para organizations/customers por decisão:
//     é log histórico de comunicação; CASCADE apagaria a prova do envio e
//     RESTRICT colidiria com o direito de eliminação da LGPD. Orfanar os UUIDs ao
//     apagar o cliente = pseudonimização (comportamento desejado). Sem FK nem RLS
//     aqui, a integridade de (org_id, customer_id) é responsabilidade da query de
//     gatilho — ver cabeçalho da migration 0063.

export const customerEmailPreferences = pgTable(
  "customer_email_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // customerId NÃO declara .references() single-column: o vínculo real é uma FK
    // COMPOSTA (customer_id, org_id) -> customers(id, org_id) ON DELETE CASCADE,
    // criada via SQL bruto na migration (garante que a preferência só referencia
    // cliente da PRÓPRIA org). Drizzle não expressa FK composta no builder de
    // coluna; o projeto não roda drizzle-kit generate desde a migration 0003 (ver
    // drizzle/migrations/README.md), então essa é uma divergência cosmética aceita.
    customerId: uuid("customer_id").notNull(),
    unsubscribeToken: text("unsubscribe_token")
      .unique()
      .notNull()
      .default(sql`encode(gen_random_bytes(32), 'hex')`),
    postServiceEnabled: boolean("post_service_enabled").notNull().default(true),
    birthdayEnabled: boolean("birthday_enabled").notNull().default(true),
    inactivityEnabled: boolean("inactivity_enabled").notNull().default(true),
    unsubscribedAllAt: timestamp("unsubscribed_all_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("customer_email_preferences_customer_org_uq").on(
      t.customerId,
      t.orgId,
    ),
    index("customer_email_preferences_org_idx").on(t.orgId),
  ],
);

export const orgCampaignSettings = pgTable(
  "org_campaign_settings",
  {
    orgId: uuid("org_id")
      .primaryKey()
      .references(() => organizations.id, { onDelete: "cascade" }),
    postServiceEnabled: boolean("post_service_enabled").notNull().default(false),
    birthdayEnabled: boolean("birthday_enabled").notNull().default(false),
    inactivityEnabled: boolean("inactivity_enabled").notNull().default(false),
    inactivityMonths: integer("inactivity_months").notNull().default(6),
    postServiceSubject: text("post_service_subject"),
    postServiceBody: text("post_service_body"),
    birthdaySubject: text("birthday_subject"),
    birthdayBody: text("birthday_body"),
    inactivitySubject: text("inactivity_subject"),
    inactivityBody: text("inactivity_body"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "org_campaign_settings_inactivity_months_check",
      sql`${t.inactivityMonths} BETWEEN 1 AND 36`,
    ),
    check(
      "org_campaign_settings_post_service_subject_check",
      sql`${t.postServiceSubject} IS NULL OR (char_length(btrim(${t.postServiceSubject}, E' \\t\\n\\r')) BETWEEN 1 AND 200 AND char_length(${t.postServiceSubject}) <= 200)`,
    ),
    check(
      "org_campaign_settings_birthday_subject_check",
      sql`${t.birthdaySubject} IS NULL OR (char_length(btrim(${t.birthdaySubject}, E' \\t\\n\\r')) BETWEEN 1 AND 200 AND char_length(${t.birthdaySubject}) <= 200)`,
    ),
    check(
      "org_campaign_settings_inactivity_subject_check",
      sql`${t.inactivitySubject} IS NULL OR (char_length(btrim(${t.inactivitySubject}, E' \\t\\n\\r')) BETWEEN 1 AND 200 AND char_length(${t.inactivitySubject}) <= 200)`,
    ),
    check(
      "org_campaign_settings_post_service_body_check",
      sql`${t.postServiceBody} IS NULL OR (char_length(btrim(${t.postServiceBody}, E' \\t\\n\\r')) BETWEEN 1 AND 5000 AND char_length(${t.postServiceBody}) <= 5000)`,
    ),
    check(
      "org_campaign_settings_birthday_body_check",
      sql`${t.birthdayBody} IS NULL OR (char_length(btrim(${t.birthdayBody}, E' \\t\\n\\r')) BETWEEN 1 AND 5000 AND char_length(${t.birthdayBody}) <= 5000)`,
    ),
    check(
      "org_campaign_settings_inactivity_body_check",
      sql`${t.inactivityBody} IS NULL OR (char_length(btrim(${t.inactivityBody}, E' \\t\\n\\r')) BETWEEN 1 AND 5000 AND char_length(${t.inactivityBody}) <= 5000)`,
    ),
  ],
);

export const campaignSends = pgTable(
  "campaign_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // orgId/customerId SEM .references() por decisão tomada: campaign_sends é log
    // histórico de comunicação e não deve ser cascateado a partir de
    // organizations/customers (CASCADE destruiria a prova do envio; RESTRICT
    // bloquearia a exclusão LGPD). Orfanar os UUIDs ao apagar o cliente é
    // pseudonimização desejada; a integridade de (org_id, customer_id) fica a
    // cargo da query de gatilho — ver cabeçalho da migration 0063.
    orgId: uuid("org_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    trigger: campaignTriggerTypeEnum("trigger").notNull(),
    status: campaignSendStatusEnum("status").notNull(),
    attempt: integer("attempt").notNull().default(1),
    dedupeKey: text("dedupe_key").notNull(),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("campaign_sends_dedupe_attempt_status_uq").on(
      t.dedupeKey,
      t.attempt,
      t.status,
    ),
    check("campaign_sends_attempt_check", sql`${t.attempt} >= 1`),
    check(
      "campaign_sends_sent_at_check",
      sql`((${t.status} = 'sent') AND (${t.sentAt} IS NOT NULL)) OR (${t.status} = 'bounced') OR ((${t.status} = 'failed') AND (${t.sentAt} IS NULL))`,
    ),
    index("campaign_sends_org_created_idx").on(t.orgId, t.createdAt.desc()),
    index("campaign_sends_retriable_idx")
      .on(t.dedupeKey)
      .where(sql`${t.status} = 'failed'`),
  ],
);

export const customerEmailPreferencesRelations = relations(
  customerEmailPreferences,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [customerEmailPreferences.orgId],
      references: [organizations.id],
    }),
    customer: one(customers, {
      fields: [customerEmailPreferences.customerId],
      references: [customers.id],
    }),
  }),
);

export const orgCampaignSettingsRelations = relations(
  orgCampaignSettings,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [orgCampaignSettings.orgId],
      references: [organizations.id],
    }),
  }),
);

export type CustomerEmailPreference =
  typeof customerEmailPreferences.$inferSelect;
export type NewCustomerEmailPreference =
  typeof customerEmailPreferences.$inferInsert;
export type OrgCampaignSettings = typeof orgCampaignSettings.$inferSelect;
export type NewOrgCampaignSettings = typeof orgCampaignSettings.$inferInsert;
export type CampaignSend = typeof campaignSends.$inferSelect;
export type NewCampaignSend = typeof campaignSends.$inferInsert;
