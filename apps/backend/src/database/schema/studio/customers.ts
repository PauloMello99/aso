import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { genderEnum } from "../enums";
import { organizations } from "../organizations";
import { customerOrigins } from "./lookup";

export const customers = pgTable("customers", {
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
  email: text("email"),
  phone: text("phone"),
  birthDate: date("birth_date"),
  gender: genderEnum("gender"),
  address: text("address"),
  notes: text("notes"),
  enabled: boolean("enabled").notNull().default(true),
  // creditBalanceCents: integer("credit_balance_cents").notNull().default(0), -- PENDENTE
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
