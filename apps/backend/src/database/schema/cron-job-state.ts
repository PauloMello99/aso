import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const cronJobState = pgTable("cron_job_state", {
  jobName: text("job_name").primaryKey(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CronJobState = typeof cronJobState.$inferSelect;
export type NewCronJobState = typeof cronJobState.$inferInsert;
