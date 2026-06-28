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
  // Referência à transação de pagamento deste serviço.
  // Transactions são agnósticas — é o service quem sabe sua transação.
  paymentTransactionId: uuid("payment_transaction_id").references(
    () => transactions.id,
    { onDelete: "set null" },
  ),
  performedBy: uuid("performed_by"),
  createdBy: uuid("created_by"),
  description: text("description"),
  amountCents: integer("amount_cents").notNull().default(0),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  performedAt: timestamp("performed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Quando preenchido, o serviço foi cancelado (estado derivado, ver módulo services).
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
