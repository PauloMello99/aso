DROP TABLE IF EXISTS "calendar_event_attendees";
--> statement-breakpoint
ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "visibility";
--> statement-breakpoint
DROP TYPE IF EXISTS "calendar_attendee_status";
--> statement-breakpoint
DROP TYPE IF EXISTS "calendar_event_visibility";
