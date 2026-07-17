-- 0032 — M10c: assinatura eletrônica na ficha de anamnese.
-- Colunas novas em anamnesis_responses guardam a identificação do assinante, os
-- artefatos gerados no envio (imagem da assinatura + PDF consolidado + hash de
-- integridade) e a proveniência da requisição (IP/user-agent), tudo opcional porque
-- respostas antigas (M10b) não tinham fluxo de assinatura. Arquivos ficam num bucket
-- PRIVADO do Storage; guardamos só o caminho e servimos via signed URL, igual ao
-- padrão de service-media (0027).
ALTER TABLE "anamnesis_responses" ADD COLUMN "signer_full_name" text;
--> statement-breakpoint
ALTER TABLE "anamnesis_responses" ADD COLUMN "signer_cpf" text;
--> statement-breakpoint
ALTER TABLE "anamnesis_responses" ADD COLUMN "signature_storage_path" text;
--> statement-breakpoint
ALTER TABLE "anamnesis_responses" ADD COLUMN "pdf_storage_path" text;
--> statement-breakpoint
ALTER TABLE "anamnesis_responses" ADD COLUMN "pdf_hash_sha256" text;
--> statement-breakpoint
ALTER TABLE "anamnesis_responses" ADD COLUMN "request_ip" text;
--> statement-breakpoint
ALTER TABLE "anamnesis_responses" ADD COLUMN "request_user_agent" text;
--> statement-breakpoint
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'anamnesis-documents',
  'anamnesis-documents',
  false,
  1048576,
  ARRAY['image/png','application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
