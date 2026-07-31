-- 0034 — conformidade legal (Tier 1): aceite de termos no cadastro + consentimento
-- específico e destacado na ficha de anamnese (dado sensível de saúde, LGPD art. 11).
-- Ambos seguem o mesmo padrão de "snapshot": a versão vigente do texto no momento do
-- aceite é gravada junto com o registro, nunca recalculada depois — mesma lógica já
-- usada em anamnesis_responses.questions_snapshot (0030).
ALTER TABLE "users" ADD COLUMN "terms_accepted_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "terms_version" text;
--> statement-breakpoint
ALTER TABLE "anamnesis_responses" ADD COLUMN "consent_text_snapshot" text;
--> statement-breakpoint
ALTER TABLE "anamnesis_responses" ADD COLUMN "consent_version" text;
--> statement-breakpoint
ALTER TABLE "anamnesis_responses" ADD COLUMN "consent_accepted_at" timestamptz;
