import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  date,
  uniqueIndex,
  unique,
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
    address: text("address").notNull(),
    // number/city/state: nullable desde a 0071. Clientes importados do sistema legado
    // Ink House vêm sem endereço estruturado (só address single-line). A
    // obrigatoriedade é mantida nas camadas de aplicação (CreateCustomerDto
    // @IsNotEmpty; customerSchema zod .min(1) no form de criar E editar).
    number: text("number"),
    addressLine2: text("address_line2"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country"),
    notes: text("notes"),
    enabled: boolean("enabled").notNull().default(true),
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
    // Base para as FKs compostas (customer_id, org_id) de
    // customer_self_registrations/customer_update_invitations (migration 0052) —
    // garante no banco que um convite so referencia cliente da PROPRIA org.
    unique("customers_id_org_id_uq").on(table.id, table.orgId),
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
