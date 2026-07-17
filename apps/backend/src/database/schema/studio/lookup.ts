import {
  pgTable,
  uuid,
  text,
  timestamp,
  unique,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "../organizations";

export const serviceTypes = pgTable(
  "service_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    requiresAgeVerification: boolean("requires_age_verification")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.orgId, t.name)],
);

export const materialCategories = pgTable(
  "material_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.orgId, t.name)],
);

export const customerOrigins = pgTable(
  "customer_origins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.orgId, t.name)],
);

// Categorias de transação por org (pré-definidas + criáveis). Padroniza descrições
// divergentes e alimenta relatórios. A `transactions.description` permanece.
export const transactionCategories = pgTable(
  "transaction_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isProtected: boolean("is_protected").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.orgId, t.name)],
);

export const serviceTypesRelations = relations(serviceTypes, ({ one }) => ({
  organization: one(organizations, {
    fields: [serviceTypes.orgId],
    references: [organizations.id],
  }),
}));

export const materialCategoriesRelations = relations(
  materialCategories,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [materialCategories.orgId],
      references: [organizations.id],
    }),
  }),
);

export const customerOriginsRelations = relations(
  customerOrigins,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [customerOrigins.orgId],
      references: [organizations.id],
    }),
  }),
);

export const transactionCategoriesRelations = relations(
  transactionCategories,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [transactionCategories.orgId],
      references: [organizations.id],
    }),
  }),
);

export type ServiceType = typeof serviceTypes.$inferSelect;
export type NewServiceType = typeof serviceTypes.$inferInsert;
export type MaterialCategory = typeof materialCategories.$inferSelect;
export type NewMaterialCategory = typeof materialCategories.$inferInsert;
export type CustomerOrigin = typeof customerOrigins.$inferSelect;
export type NewCustomerOrigin = typeof customerOrigins.$inferInsert;
export type TransactionCategory = typeof transactionCategories.$inferSelect;
export type NewTransactionCategory = typeof transactionCategories.$inferInsert;
