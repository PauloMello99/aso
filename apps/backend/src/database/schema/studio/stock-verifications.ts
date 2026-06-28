import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "../organizations";
import { materials } from "./materials";

// Conferência física de estoque (cabeçalho). Cada conferência registra a contagem
// física vs. o que o sistema tinha, por material (itens). Discrepância = físico − sistema.
export const stockVerifications = pgTable("stock_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  performedBy: uuid("performed_by"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const stockVerificationItems = pgTable("stock_verification_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  verificationId: uuid("verification_id")
    .notNull()
    .references(() => stockVerifications.id, { onDelete: "cascade" }),
  materialId: uuid("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "cascade" }),
  systemQuantity: numeric("system_quantity", { precision: 10, scale: 2 }).notNull(),
  physicalQuantity: numeric("physical_quantity", {
    precision: 10,
    scale: 2,
  }).notNull(),
});

export const stockVerificationsRelations = relations(
  stockVerifications,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [stockVerifications.orgId],
      references: [organizations.id],
    }),
    items: many(stockVerificationItems),
  }),
);

export const stockVerificationItemsRelations = relations(
  stockVerificationItems,
  ({ one }) => ({
    verification: one(stockVerifications, {
      fields: [stockVerificationItems.verificationId],
      references: [stockVerifications.id],
    }),
    material: one(materials, {
      fields: [stockVerificationItems.materialId],
      references: [materials.id],
    }),
  }),
);

export type StockVerification = typeof stockVerifications.$inferSelect;
export type NewStockVerification = typeof stockVerifications.$inferInsert;
export type StockVerificationItem = typeof stockVerificationItems.$inferSelect;
export type NewStockVerificationItem =
  typeof stockVerificationItems.$inferInsert;
