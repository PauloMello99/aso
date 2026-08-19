import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { paymentMethodEnum } from "../enums";
import { organizations } from "../organizations";
import { serviceTypes } from "./lookup";
import { customers } from "./customers";
import { materials } from "./materials";
import { transactions } from "./transactions";
import { anamnesisResponses } from "./anamnesis";
import { orgMemberCommissions } from "./member-commissions";

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  serviceTypeId: uuid("service_type_id").references(() => serviceTypes.id, {
    onDelete: "set null",
  }),
  customerId: uuid("customer_id").references(() => customers.id, {
    onDelete: "set null",
  }),
  paymentTransactionId: uuid("payment_transaction_id").references(
    () => transactions.id,
    { onDelete: "set null" },
  ),
  anamnesisResponseId: uuid("anamnesis_response_id").references(
    () => anamnesisResponses.id,
    { onDelete: "set null" },
  ),
  performedBy: uuid("performed_by"),
  createdBy: uuid("created_by"),
  description: text("description"),
  amountCents: integer("amount_cents").notNull().default(0),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  // Snapshot desnormalizado da comissão do profissional no momento do
  // atendimento. commissionConfigId é só auditoria (aponta pra linha de
  // config que gerou o snapshot) — NUNCA lido para cálculo, porque a config
  // pode ser superseded depois; percent/mode/base/cents abaixo são a
  // verdade congelada.
  commissionConfigId: uuid("commission_config_id").references(
    () => orgMemberCommissions.id,
    { onDelete: "set null" },
  ),
  commissionPercent: numeric("commission_percent", { precision: 5, scale: 2 }),
  commissionMode: text("commission_mode"),
  commissionBaseCents: integer("commission_base_cents").notNull().default(0),
  commissionCents: integer("commission_cents").notNull().default(0),
  performedAt: timestamp("performed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const serviceMaterials = pgTable(
  "service_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "restrict" }),
    quantity: numeric("quantity", { precision: 10, scale: 2 })
      .notNull()
      .default("1"),
  },
  (t) => [unique().on(t.serviceId, t.materialId)],
);

export const servicesRelations = relations(services, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [services.orgId],
    references: [organizations.id],
  }),
  serviceType: one(serviceTypes, {
    fields: [services.serviceTypeId],
    references: [serviceTypes.id],
  }),
  customer: one(customers, {
    fields: [services.customerId],
    references: [customers.id],
  }),
  paymentTransaction: one(transactions, {
    fields: [services.paymentTransactionId],
    references: [transactions.id],
  }),
  anamnesisResponse: one(anamnesisResponses, {
    fields: [services.anamnesisResponseId],
    references: [anamnesisResponses.id],
  }),
  // Só auditoria (aponta pra linha de org_member_commissions que originou o
  // snapshot) — NUNCA fonte de cálculo. A verdade congelada é
  // commissionPercent/commissionMode/commissionBaseCents/commissionCents
  // acima, porque a config apontada pode ter sido superseded depois.
  commissionConfig: one(orgMemberCommissions, {
    fields: [services.commissionConfigId],
    references: [orgMemberCommissions.id],
  }),
  serviceMaterials: many(serviceMaterials),
}));

export const serviceMaterialsRelations = relations(
  serviceMaterials,
  ({ one }) => ({
    service: one(services, {
      fields: [serviceMaterials.serviceId],
      references: [services.id],
    }),
    material: one(materials, {
      fields: [serviceMaterials.materialId],
      references: [materials.id],
    }),
  }),
);

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type ServiceMaterial = typeof serviceMaterials.$inferSelect;
export type NewServiceMaterial = typeof serviceMaterials.$inferInsert;
