import {
  pgTable,
  uuid,
  integer,
  jsonb,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "../organizations";
import { users } from "../users";
import { serviceTypes } from "./lookup";

/** Snapshot de uma pergunta do formulário, imutável dentro de uma versão. */
export type AnamnesisQuestion = {
  id: string;
  type: "text" | "yes_no";
  label: string;
  required: boolean;
};

// Um formulário por tipo de serviço (serviceTypeId UNIQUE). O "cabeçalho" só
// mantém a relação estável; as perguntas em si vivem nas versões imutáveis.
export const anamnesisForms = pgTable(
  "anamnesis_forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    serviceTypeId: uuid("service_type_id")
      .notNull()
      .references(() => serviceTypes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.serviceTypeId)],
);

// Versões imutáveis: cada save cria uma nova linha (nunca UPDATE). org_id
// denormalizado pra RLS, igual ao padrão de service_media/customer_attachments.
export const anamnesisFormVersions = pgTable(
  "anamnesis_form_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => anamnesisForms.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    questions: jsonb("questions").$type<AnamnesisQuestion[]>().notNull(),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.formId, t.versionNumber)],
);

export const anamnesisFormsRelations = relations(
  anamnesisForms,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [anamnesisForms.orgId],
      references: [organizations.id],
    }),
    serviceType: one(serviceTypes, {
      fields: [anamnesisForms.serviceTypeId],
      references: [serviceTypes.id],
    }),
    versions: many(anamnesisFormVersions),
  }),
);

export const anamnesisFormVersionsRelations = relations(
  anamnesisFormVersions,
  ({ one }) => ({
    form: one(anamnesisForms, {
      fields: [anamnesisFormVersions.formId],
      references: [anamnesisForms.id],
    }),
    organization: one(organizations, {
      fields: [anamnesisFormVersions.orgId],
      references: [organizations.id],
    }),
    createdByUser: one(users, {
      fields: [anamnesisFormVersions.createdBy],
      references: [users.id],
    }),
  }),
);

export type AnamnesisForm = typeof anamnesisForms.$inferSelect;
export type NewAnamnesisForm = typeof anamnesisForms.$inferInsert;
export type AnamnesisFormVersion = typeof anamnesisFormVersions.$inferSelect;
export type NewAnamnesisFormVersion = typeof anamnesisFormVersions.$inferInsert;
