CREATE TYPE "public"."calendar_event_type" AS ENUM('appointment', 'unavailability');--> statement-breakpoint
ALTER TABLE "calendar_events" ALTER COLUMN "assigned_to" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "type" "calendar_event_type" DEFAULT 'appointment' NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_events_org_member_starts_idx" ON "calendar_events" USING btree ("org_id","assigned_to","starts_at");