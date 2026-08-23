import {
  pgTable,
  uuid,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "../organizations";
import { users } from "../users";
import { anamnesisResponseStatusEnum } from "../enums";
import { serviceTypes } from "./lookup";
import { customers } from "./customers";

export type AnamnesisQuestion = {
  id: string;
  type: "text" | "yes_no";
  label: string;
  required: boolean;
};

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

export const anamnesisResponses = pgTable(
  "anamnesis_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    formVersionId: uuid("form_version_id").references(
      () => anamnesisFormVersions.id,
      { onDelete: "set null" },
    ),
    serviceTypeId: uuid("service_type_id").references(() => serviceTypes.id, {
      onDelete: "set null",
    }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    questionsSnapshot: jsonb("questions_snapshot")
      .$type<AnamnesisQuestion[]>()
      .notNull(),
    token: text("token")
      .unique()
      .notNull()
      .default(sql`encode(gen_random_bytes(32), 'hex')`),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '7 days'`),
    status: anamnesisResponseStatusEnum("status").notNull().default("pending"),
    answers: jsonb("answers").$type<
      { questionId: string; value: string | boolean }[]
    >(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    signerFullName: text("signer_full_name"),
    signerCpf: text("signer_cpf"),
    signatureStoragePath: text("signature_storage_path"),
    pdfStoragePath: text("pdf_storage_path"),
    pdfHashSha256: text("pdf_hash_sha256"),
    requestIp: text("request_ip"),
    requestUserAgent: text("request_user_agent"),
    consentTextSnapshot: text("consent_text_snapshot"),
    consentVersion: text("consent_version"),
    consentAcceptedAt: timestamp("consent_accepted_at", { withTimezone: true }),
  },
  (t) => [
    index("anamnesis_responses_org_customer_status_idx").on(
      t.orgId,
      t.customerId,
      t.status,
    ),
  ],
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

export const anamnesisResponsesRelations = relations(
  anamnesisResponses,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [anamnesisResponses.orgId],
      references: [organizations.id],
    }),
    formVersion: one(anamnesisFormVersions, {
      fields: [anamnesisResponses.formVersionId],
      references: [anamnesisFormVersions.id],
    }),
    serviceType: one(serviceTypes, {
      fields: [anamnesisResponses.serviceTypeId],
      references: [serviceTypes.id],
    }),
    customer: one(customers, {
      fields: [anamnesisResponses.customerId],
      references: [customers.id],
    }),
    createdByUser: one(users, {
      fields: [anamnesisResponses.createdBy],
      references: [users.id],
    }),
  }),
);

export type AnamnesisForm = typeof anamnesisForms.$inferSelect;
export type NewAnamnesisForm = typeof anamnesisForms.$inferInsert;
export type AnamnesisFormVersion = typeof anamnesisFormVersions.$inferSelect;
export type NewAnamnesisFormVersion = typeof anamnesisFormVersions.$inferInsert;
export type AnamnesisResponse = typeof anamnesisResponses.$inferSelect;
export type NewAnamnesisResponse = typeof anamnesisResponses.$inferInsert;
