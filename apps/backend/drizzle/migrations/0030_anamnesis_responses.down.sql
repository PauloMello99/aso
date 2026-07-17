DROP INDEX IF EXISTS "services_anamnesis_response_id_unique";
--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN IF EXISTS "anamnesis_response_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "anamnesis_responses";
--> statement-breakpoint
DROP TYPE IF EXISTS "anamnesis_response_status";
