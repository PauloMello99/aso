import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { stockMovementTypeEnum } from "../enums";
import { organizations } from "../organizations";
import { materials } from "./materials";
import { services } from "./services";

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    type: stockMovementTypeEnum("type").notNull(),
    // Positive = stock in (restock, positive manual adjustment)
    // Negative = stock out (service consumption, waste, negative adjustment)
    quantityDelta: numeric("quantity_delta", { precision: 10, scale: 2 }).notNull(),
    // Populated when type = 'service_consumption'
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("stock_movements_material_id_created_at_idx").on(
      t.materialId,
      t.createdAt,
    ),
    index("stock_movements_org_id_created_at_idx").on(t.orgId, t.createdAt),
  ],
);

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  organization: one(organizations, {
    fields: [stockMovements.orgId],
    references: [organizations.id],
  }),
  material: one(materials, {
    fields: [stockMovements.materialId],
    references: [materials.id],
  }),
  service: one(services, {
    fields: [stockMovements.serviceId],
    references: [services.id],
  }),
}));

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
