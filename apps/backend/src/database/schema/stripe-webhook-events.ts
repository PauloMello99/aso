import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;
export type NewStripeWebhookEvent = typeof stripeWebhookEvents.$inferInsert;
