DROP INDEX IF EXISTS "calendar_events_customer_reminder_due_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "calendar_events_confirmation_token_hash_uq";
--> statement-breakpoint
ALTER TABLE "calendar_events" DROP CONSTRAINT IF EXISTS "calendar_events_confirmation_consistency_check";
--> statement-breakpoint
ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "customer_reminder_sent_at";
--> statement-breakpoint
ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "confirmation_responded_at";
--> statement-breakpoint
ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "confirmation_sent_at";
--> statement-breakpoint
ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "confirmation_requested_at";
--> statement-breakpoint
ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "confirmation_token_hash";
--> statement-breakpoint
ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "confirmation_status";
--> statement-breakpoint
ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "customer_email";
--> statement-breakpoint
DROP TYPE IF EXISTS "calendar_event_confirmation_status";
