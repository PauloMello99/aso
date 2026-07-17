ALTER TABLE "anamnesis_responses" DROP COLUMN IF EXISTS "signer_full_name";
--> statement-breakpoint
ALTER TABLE "anamnesis_responses" DROP COLUMN IF EXISTS "signer_cpf";
--> statement-breakpoint
ALTER TABLE "anamnesis_responses" DROP COLUMN IF EXISTS "signature_storage_path";
--> statement-breakpoint
ALTER TABLE "anamnesis_responses" DROP COLUMN IF EXISTS "pdf_storage_path";
--> statement-breakpoint
ALTER TABLE "anamnesis_responses" DROP COLUMN IF EXISTS "pdf_hash_sha256";
--> statement-breakpoint
ALTER TABLE "anamnesis_responses" DROP COLUMN IF EXISTS "request_ip";
--> statement-breakpoint
ALTER TABLE "anamnesis_responses" DROP COLUMN IF EXISTS "request_user_agent";
-- Bucket 'anamnesis-documents' é deixado intacto: Supabase Storage bloqueia DELETE
-- direto em storage.buckets/storage.objects via SQL ("Use the Storage API instead").
-- Reaplicar a migration (up) é idempotente (ON CONFLICT DO UPDATE), então não há
-- efeito colateral em deixar o bucket órfão após um rollback local. Remoção real (se
-- necessária) deve ser feita via Supabase Storage API/dashboard, nunca DELETE bruto.
