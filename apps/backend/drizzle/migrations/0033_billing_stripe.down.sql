-- Reverte 0033. O backfill NÃO é revertido: as linhas de subscriptions criadas para
-- organizações que não tinham nenhuma continuam existindo após o rollback — elas só
-- perdem as colunas novas (stripe_price_id, stripe_coupon_id, discount_percent,
-- comp_reason, comp_granted_by, comp_expires_at, trial_consumed). Isso é esperado e
-- seguro: as linhas em si (org_id, type, status, grace_period_days) não são apagadas
-- por este rollback; reaplicar a migration (up) não repopula essas colunas para linhas
-- já existentes, um novo backfill manual seria necessário para isso se um dia precisar.
DROP TABLE IF EXISTS "billing_invoice_events";
--> statement-breakpoint
DROP TABLE IF EXISTS "billing_plans";
--> statement-breakpoint
DROP TABLE IF EXISTS "stripe_webhook_events";
--> statement-breakpoint

ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "trial_consumed";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "comp_expires_at";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "comp_granted_by";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "comp_reason";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "discount_percent";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripe_coupon_id";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripe_price_id";
--> statement-breakpoint

DROP TYPE IF EXISTS "public"."billing_invoice_event_type";
