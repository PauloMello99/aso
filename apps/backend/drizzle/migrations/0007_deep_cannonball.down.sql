DROP INDEX IF EXISTS "calendar_events_org_member_starts_idx";--> statement-breakpoint
ALTER TABLE "calendar_events" DROP CONSTRAINT IF EXISTS "calendar_events_created_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "calendar_events" DROP CONSTRAINT IF EXISTS "calendar_events_assigned_to_users_id_fk";--> statement-breakpoint
ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "type";--> statement-breakpoint
ALTER TABLE "calendar_events" ALTER COLUMN "assigned_to" DROP NOT NULL;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."calendar_event_type";
