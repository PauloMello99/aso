import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { genderEnum } from "../enums";
import { organizations } from "../organizations";
import { customerOrigins } from "./lookup";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Nullable: reservado para o portal do cliente (futuro)
    userId: uuid("user_id"),
    originId: uuid("origin_id").references(() => customerOrigins.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    birthDate: date("birth_date").notNull(),
    gender: genderEnum("gender"),
    // Endereço internacional genérico (decisão 2026-06-14):
    // `address` = linha 1 (logradouro/número). Demais campos estruturados abaixo.
    address: text("address").notNull(),
    number: text("number").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postal_code"),
    country: text("country"),
    notes: text("notes"),
    enabled: boolean("enabled").notNull().default(true),
    // creditBalanceCents: integer("credit_balance_cents").notNull().default(0), -- PENDENTE
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("customers_org_email_lower_uq")
      .on(table.orgId, sql`lower(btrim(${table.email}))`)
      .where(sql`${table.email} is not null and btrim(${table.email}) <> ''`),
  ],
);

export const customersRelations = relations(customers, ({ one }) => ({
  organization: one(organizations, {
    fields: [customers.orgId],
    references: [organizations.id],
  }),
  origin: one(customerOrigins, {
    fields: [customers.originId],
    references: [customerOrigins.id],
  }),
}));

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
