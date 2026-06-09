import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "../organizations";
import { materialCategories } from "./lookup";

export const materials = pgTable("materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => materialCategories.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  stockQuantity: numeric("stock_quantity", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  minimumQuantity: numeric("minimum_quantity", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  costPerUnit: numeric("cost_per_unit", { precision: 10, scale: 2 }),
  unit: text("unit"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const materialsRelations = relations(materials, ({ one }) => ({
  organization: one(organizations, {
    fields: [materials.orgId],
    references: [organizations.id],
  }),
  category: one(materialCategories, {
    fields: [materials.categoryId],
    references: [materialCategories.id],
  }),
}));

export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;
