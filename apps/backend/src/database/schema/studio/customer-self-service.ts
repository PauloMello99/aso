import { pgTable, uuid, text, timestamp, check } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "../organizations";
import { users } from "../users";
import { serviceTypes } from "./lookup";
import { customers } from "./customers";
import { anamnesisResponses } from "./anamnesis";

export const customerSelfRegistrations = pgTable(
  "customer_self_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    serviceTypeId: uuid("service_type_id").references(() => serviceTypes.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    token: text("token")
      .unique()
      .notNull()
      .default(sql`encode(gen_random_bytes(32), 'hex')`),
    anamnesisResponseId: uuid("anamnesis_response_id").references(
      () => anamnesisResponses.id,
      { onDelete: "set null" },
    ),
    // customerId NAO declara .references() single-column: o vinculo real e uma FK
    // COMPOSTA (customer_id, org_id) -> customers(id, org_id) com ON DELETE SET NULL
    // restrito a customer_id, criada via SQL bruto na migration (garante que o customer
    // pertence a esta mesma org — ver decisao (e) no cabecalho da migration 0052).
    // Drizzle nao expressa FK composta no builder de coluna; o projeto nao roda
    // drizzle-kit generate desde a migration 0003 (ver drizzle/migrations/README.md),
    // entao essa e uma divergencia cosmetica aceita.
    customerId: uuid("customer_id"),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '7 days'`),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "customer_self_registrations_status_check",
      sql`${t.status} IN ('pending','submitted')`,
    ),
    check(
      "customer_self_registrations_status_submitted_at_check",
      sql`(${t.status} = 'pending' AND ${t.submittedAt} IS NULL) OR (${t.status} = 'submitted' AND ${t.submittedAt} IS NOT NULL)`,
    ),
  ],
);

export const customerUpdateInvitations = pgTable(
  "customer_update_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // customerId NAO declara .references() single-column: o vinculo real e uma FK
    // COMPOSTA (customer_id, org_id) -> customers(id, org_id), criada via SQL bruto na
    // migration (garante que o customer pertence a esta mesma org — ver decisao (e) no
    // cabecalho da migration 0052). Drizzle nao expressa FK composta no builder de
    // coluna; o projeto nao roda drizzle-kit generate desde a migration 0003 (ver
    // drizzle/migrations/README.md), entao essa e uma divergencia cosmetica aceita.
    customerId: uuid("customer_id").notNull(),
    token: text("token")
      .unique()
      .notNull()
      .default(sql`encode(gen_random_bytes(32), 'hex')`),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '7 days'`),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "customer_update_invitations_status_check",
      sql`${t.status} IN ('pending','submitted')`,
    ),
    check(
      "customer_update_invitations_status_submitted_at_check",
      sql`(${t.status} = 'pending' AND ${t.submittedAt} IS NULL) OR (${t.status} = 'submitted' AND ${t.submittedAt} IS NOT NULL)`,
    ),
  ],
);

export const customerSelfRegistrationsRelations = relations(
  customerSelfRegistrations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [customerSelfRegistrations.orgId],
      references: [organizations.id],
    }),
    serviceType: one(serviceTypes, {
      fields: [customerSelfRegistrations.serviceTypeId],
      references: [serviceTypes.id],
    }),
    anamnesisResponse: one(anamnesisResponses, {
      fields: [customerSelfRegistrations.anamnesisResponseId],
      references: [anamnesisResponses.id],
    }),
    customer: one(customers, {
      fields: [customerSelfRegistrations.customerId],
      references: [customers.id],
    }),
    createdByUser: one(users, {
      fields: [customerSelfRegistrations.createdBy],
      references: [users.id],
    }),
  }),
);

export const customerUpdateInvitationsRelations = relations(
  customerUpdateInvitations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [customerUpdateInvitations.orgId],
      references: [organizations.id],
    }),
    customer: one(customers, {
      fields: [customerUpdateInvitations.customerId],
      references: [customers.id],
    }),
    createdByUser: one(users, {
      fields: [customerUpdateInvitations.createdBy],
      references: [users.id],
    }),
  }),
);

export type CustomerSelfRegistration =
  typeof customerSelfRegistrations.$inferSelect;
export type NewCustomerSelfRegistration =
  typeof customerSelfRegistrations.$inferInsert;
export type CustomerUpdateInvitation =
  typeof customerUpdateInvitations.$inferSelect;
export type NewCustomerUpdateInvitation =
  typeof customerUpdateInvitations.$inferInsert;
