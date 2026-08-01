import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "../organizations";
import { services } from "./services";

export const serviceMedia = pgTable(
  "service_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type"),
    uploadedBy: uuid("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("service_media_service_id_idx").on(t.serviceId)],
);

export const serviceMediaRelations = relations(serviceMedia, ({ one }) => ({
  organization: one(organizations, {
    fields: [serviceMedia.orgId],
    references: [organizations.id],
  }),
  service: one(services, {
    fields: [serviceMedia.serviceId],
    references: [services.id],
  }),
}));

export type ServiceMedia = typeof serviceMedia.$inferSelect;
export type NewServiceMedia = typeof serviceMedia.$inferInsert;
