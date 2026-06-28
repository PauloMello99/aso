import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "../organizations";
import { customers } from "./customers";

// Anexos genéricos do cliente (ex.: ficha de anamnese escaneada). Arquivos ficam
// num bucket PRIVADO do Storage; guardamos só o caminho e servimos via signed URL.
export const customerAttachments = pgTable("customer_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type"),
  uploadedBy: uuid("uploaded_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const customerAttachmentsRelations = relations(
  customerAttachments,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [customerAttachments.orgId],
      references: [organizations.id],
    }),
    customer: one(customers, {
      fields: [customerAttachments.customerId],
      references: [customers.id],
    }),
  }),
);

export type CustomerAttachment = typeof customerAttachments.$inferSelect;
export type NewCustomerAttachment = typeof customerAttachments.$inferInsert;
