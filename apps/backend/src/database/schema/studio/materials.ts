import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  boolean,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "../organizations";
import { materialCategories, serviceTypes } from "./lookup";

export const materials = pgTable(
  "materials",
  {
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
    shareable: boolean("shareable").notNull().default(false),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Base para a FK composta (material_id, org_id) de material_service_types
    // (migration 0072) — garante no banco que um vinculo so referencia
    // material da PROPRIA org. NAO remover sem antes remover aquela FK.
    unique("materials_id_org_uq").on(t.id, t.orgId),
  ],
);

export const materialServiceTypes = pgTable(
  "material_service_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // FK real no banco é COMPOSTA (material_id, org_id) -> materials(id, org_id)
    // — impede vincular material de outra org (ver 0072).
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    // FK real no banco é COMPOSTA (service_type_id, org_id) -> service_types(id, org_id).
    serviceTypeId: uuid("service_type_id")
      .notNull()
      .references(() => serviceTypes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("material_service_types_material_type_uq").on(
      t.materialId,
      t.serviceTypeId,
    ),
  ],
);

export const materialsRelations = relations(materials, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [materials.orgId],
    references: [organizations.id],
  }),
  category: one(materialCategories, {
    fields: [materials.categoryId],
    references: [materialCategories.id],
  }),
  serviceTypes: many(materialServiceTypes),
}));

export const materialServiceTypesRelations = relations(
  materialServiceTypes,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [materialServiceTypes.orgId],
      references: [organizations.id],
    }),
    material: one(materials, {
      fields: [materialServiceTypes.materialId],
      references: [materials.id],
    }),
    serviceType: one(serviceTypes, {
      fields: [materialServiceTypes.serviceTypeId],
      references: [serviceTypes.id],
    }),
  }),
);

export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;
export type MaterialServiceType = typeof materialServiceTypes.$inferSelect;
export type NewMaterialServiceType = typeof materialServiceTypes.$inferInsert;
