DROP TABLE IF EXISTS "service_media";
--> statement-breakpoint
ALTER TABLE "service_types" DROP COLUMN IF EXISTS "requires_age_verification";
-- Bucket 'service-media' é deixado intacto: Supabase Storage bloqueia DELETE direto em
-- storage.buckets/storage.objects via SQL ("Use the Storage API instead"). Reaplicar a
-- migration (up) é idempotente (ON CONFLICT DO UPDATE), então não há efeito colateral em
-- deixar o bucket órfão após um rollback local. Remoção real (se necessária) deve ser
-- feita via Supabase Storage API/dashboard, nunca DELETE bruto.
