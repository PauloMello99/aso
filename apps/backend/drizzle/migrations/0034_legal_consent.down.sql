ALTER TABLE "anamnesis_responses" DROP COLUMN IF EXISTS "consent_accepted_at";
ALTER TABLE "anamnesis_responses" DROP COLUMN IF EXISTS "consent_version";
ALTER TABLE "anamnesis_responses" DROP COLUMN IF EXISTS "consent_text_snapshot";
ALTER TABLE "users" DROP COLUMN IF EXISTS "terms_version";
ALTER TABLE "users" DROP COLUMN IF EXISTS "terms_accepted_at";
