-- Reverte 0091.
--
-- Atenção: o down FALHA se existir linha com status <> 'new' (o CHECK antigo só
-- admite 'new') e DESCARTA a fila de purga (purge_*) e closed_at. Drene a fila
-- (cron de purga) e resolva os pedidos encerrados antes de reverter.

DROP INDEX IF EXISTS "public"."quote_requests_purge_pending_idx";
--> statement-breakpoint

ALTER TABLE "public"."quote_requests" DROP CONSTRAINT IF EXISTS "quote_requests_purge_last_error_check";
--> statement-breakpoint
ALTER TABLE "public"."quote_requests" DROP CONSTRAINT IF EXISTS "quote_requests_purge_attempts_check";
--> statement-breakpoint
ALTER TABLE "public"."quote_requests" DROP CONSTRAINT IF EXISTS "quote_requests_not_scheduled_consent_check";
--> statement-breakpoint
ALTER TABLE "public"."quote_requests" DROP CONSTRAINT IF EXISTS "quote_requests_scheduled_purge_check";
--> statement-breakpoint
ALTER TABLE "public"."quote_requests" DROP CONSTRAINT IF EXISTS "quote_requests_purge_images_scope_check";
--> statement-breakpoint
ALTER TABLE "public"."quote_requests" DROP CONSTRAINT IF EXISTS "quote_requests_purge_scope_check";
--> statement-breakpoint
ALTER TABLE "public"."quote_requests" DROP CONSTRAINT IF EXISTS "quote_requests_retention_window_check";
--> statement-breakpoint
ALTER TABLE "public"."quote_requests" DROP CONSTRAINT IF EXISTS "quote_requests_closed_at_check";
--> statement-breakpoint
ALTER TABLE "public"."quote_requests" DROP CONSTRAINT IF EXISTS "quote_requests_status_check";
--> statement-breakpoint
ALTER TABLE "public"."quote_requests"
  ADD CONSTRAINT "quote_requests_status_check" CHECK ("status" IN ('new'));
--> statement-breakpoint

ALTER TABLE "public"."quote_requests" DROP COLUMN IF EXISTS "purge_last_error";
--> statement-breakpoint
ALTER TABLE "public"."quote_requests" DROP COLUMN IF EXISTS "purge_last_attempt_at";
--> statement-breakpoint
ALTER TABLE "public"."quote_requests" DROP COLUMN IF EXISTS "purge_attempts";
--> statement-breakpoint
ALTER TABLE "public"."quote_requests" DROP COLUMN IF EXISTS "purge_scope";
--> statement-breakpoint
ALTER TABLE "public"."quote_requests" DROP COLUMN IF EXISTS "purge_requested_at";
--> statement-breakpoint
ALTER TABLE "public"."quote_requests" DROP COLUMN IF EXISTS "closed_at";
