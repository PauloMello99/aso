-- 0028 — M9: tour de onboarding.
-- onboarding_completed_at marca quando o usuário concluiu (ou dispensou) o tour de
-- onboarding do produto. Nullable, sem default: usuários existentes verão o tour uma
-- vez, é dismissível e barato de repetir — backfill de linhas existentes é
-- intencionalmente NÃO incluído.
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" timestamptz;
