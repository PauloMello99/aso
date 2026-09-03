import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { campaignSendStatusEnum, campaignTriggerTypeEnum } from "../enums";
import { organizations } from "../organizations";
import { customers } from "./customers";
import type { TiptapDoc } from "../../../modules/campaigns/domain/campaign-body";

// Módulo de campanhas de e-mail por gatilho (T6 Bloco A). Invariantes vivem no
// banco (migrations 0061/0063 e, para "campaigns", a 0066), espelhadas aqui só
// para leitura — editar este arquivo NÃO gera/altera as migrations já aplicadas.
// A antiga "org_campaign_settings" (0062) foi dropada pela 0067.
//
//   - customer_email_preferences: opt-out por cliente. Ausência de linha = cliente
//     não optou por sair de nada. "unsubscribe_token" é gerado só pelo DEFAULT do
//     banco e NUNCA rotaciona (viaja em links de e-mails já entregues — LGPD).
//   - campaign_sends: log append-only PURO (D2, espírito do ADR-0010). UMA LINHA
//     POR (tentativa, status terminal), nunca UPDATE/DELETE. "dedupe_key" é o
//     contrato de idempotência. Sem FK para organizations/customers por decisão:
//     é log histórico de comunicação; CASCADE apagaria a prova do envio e
//     RESTRICT colidiria com o direito de eliminação da LGPD. Orfanar os UUIDs ao
//     apagar o cliente = pseudonimização (comportamento desejado). Sem FK nem RLS
//     aqui, a integridade de (org_id, customer_id) é responsabilidade da query de
//     gatilho — ver cabeçalho da migration 0063.
//   - campaigns (T6 rework, migration 0066): N linhas por org, UMA por gatilho
//     (UNIQUE org_id, trigger). Substituiu a antiga "org_campaign_settings" (0062,
//     1 linha/org, colunas por gatilho), dropada pela 0067. "subject"/"body" NULL =
//     usa o texto default autoral do produto; "body" é um doc rich-text em jsonb
//     (shape/tamanho validados por CHECK no banco).

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

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    trigger: campaignTriggerTypeEnum("trigger").notNull(),
    name: text("name").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    subject: text("subject"),
    body: jsonb("body").$type<TiptapDoc | null>(),
    inactivityMonths: integer("inactivity_months"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("campaigns_org_trigger_uq").on(t.orgId, t.trigger),
    check(
      "campaigns_name_check",
      sql`char_length(btrim(${t.name}, E' \\t\\n\\r')) BETWEEN 1 AND 80 AND char_length(${t.name}) <= 80`,
    ),
    check(
      "campaigns_subject_check",
      sql`${t.subject} IS NULL OR (char_length(btrim(${t.subject}, E' \\t\\n\\r')) BETWEEN 1 AND 200 AND char_length(${t.subject}) <= 200)`,
    ),
    check(
      "campaigns_body_size_check",
      sql`${t.body} IS NULL OR octet_length(${t.body}::text) <= 65536`,
    ),
    check(
      "campaigns_body_shape_check",
      sql`${t.body} IS NULL OR jsonb_typeof(${t.body}) = 'object'`,
    ),
    check(
      "campaigns_inactivity_months_check",
      sql`CASE WHEN ${t.trigger} = 'inactivity' THEN ${t.inactivityMonths} BETWEEN 1 AND 36 ELSE ${t.inactivityMonths} IS NULL END`,
    ),
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

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  organization: one(organizations, {
    fields: [campaigns.orgId],
    references: [organizations.id],
  }),
}));

export type CustomerEmailPreference =
  typeof customerEmailPreferences.$inferSelect;
export type NewCustomerEmailPreference =
  typeof customerEmailPreferences.$inferInsert;
export type CampaignSend = typeof campaignSends.$inferSelect;
export type NewCampaignSend = typeof campaignSends.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
