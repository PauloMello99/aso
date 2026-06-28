DROP TABLE IF EXISTS "notifications";--> statement-breakpoint
ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "reminder_sent_at";--> statement-breakpoint
ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."notification_type";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."calendar_event_status";
