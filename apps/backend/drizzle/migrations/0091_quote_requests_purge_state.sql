-- 0091 — Estado de encerramento e fila de purga dos pedidos de orçamento
-- (Bloco C, fatia C3a): base para expiração, purga verificada do storage e sweep.
--
-- Decisões não óbvias:
--   (i)   `status` segue text + CHECK (ADR-0035 / 0087-iii): o CHECK é recriado com
--         'new' | 'scheduled' | 'not_scheduled'. A C3a só cria o desenho; quem
--         transiciona o estado é a C3b.
--   (ii)  `closed_at` é NULL se e somente se status = 'new'. `expires_at` é o prazo
--         final da LINHA: para 'new' é imutável (created_at + 30 dias; visualizar
--         NÃO estende) e o CHECK de janela limita expires_at a 720h após
--         COALESCE(closed_at, created_at).
--   (iii) Fila de purga em colunas da própria linha (sem tabela nova): só o
--         DRIZZLE_ADMIN escreve `purge_*`. Nenhum GRANT/policy novo: o GRANT de
--         coluna da sessão do tenant (0089) continua restrito a `viewed_at`.
--   (iv)  `purge_attempts` incrementa no CLAIM; `purge_last_attempt_at` é lease
--         (10 min) e chave de CAS na conclusão da purga de imagens.
--   (v)   `purge_scope`: 'all' apaga a linha (imagens por CASCADE); 'images' só
--         apaga as imagens e zera a fila, e só vale para 'not_scheduled'.
--   (vi)  `purge_last_error` guarda apenas um código saneado (sem PII nem texto
--         de provider).
--   (viii) CHECK passa quando o resultado e NULL: por isso os CHECKs que comparam
--         `purge_scope` (nullable) usam IS [NOT] DISTINCT FROM — `purge_scope = 'all'`
--         com scope NULL daria NULL e aprovaria a linha. Os demais CHECKs so
--         comparam colunas NOT NULL ou usam IS NULL, sem esse risco.
--   (vii) Linhas existentes são todas status='new' (0087) com expires_at =
--         created_at + 30 dias: satisfazem todos os CHECKs novos sem backfill.

ALTER TABLE "public"."quote_requests"
  ADD COLUMN "closed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "public"."quote_requests"
  ADD COLUMN "purge_requested_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "public"."quote_requests"
  ADD COLUMN "purge_scope" text;
--> statement-breakpoint
ALTER TABLE "public"."quote_requests"
  ADD COLUMN "purge_attempts" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "public"."quote_requests"
  ADD COLUMN "purge_last_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "public"."quote_requests"
  ADD COLUMN "purge_last_error" text;
--> statement-breakpoint

ALTER TABLE "public"."quote_requests"
  DROP CONSTRAINT "quote_requests_status_check";
--> statement-breakpoint
ALTER TABLE "public"."quote_requests"
  ADD CONSTRAINT "quote_requests_status_check"
  CHECK ("status" IN ('new','scheduled','not_scheduled'));
--> statement-breakpoint
ALTER TABLE "public"."quote_requests"
  ADD CONSTRAINT "quote_requests_closed_at_check"
  CHECK (("status" = 'new') = ("closed_at" IS NULL) AND ("closed_at" IS NULL OR "closed_at" >= "created_at"));
--> statement-breakpoint
ALTER TABLE "public"."quote_requests"
  ADD CONSTRAINT "quote_requests_retention_window_check"
  CHECK ("expires_at" <= COALESCE("closed_at", "created_at") + interval '720 hours');
--> statement-breakpoint
ALTER TABLE "public"."quote_requests"
  ADD CONSTRAINT "quote_requests_purge_scope_check"
  CHECK (("purge_requested_at" IS NULL) = ("purge_scope" IS NULL) AND ("purge_scope" IS NULL OR "purge_scope" IN ('all','images')));
--> statement-breakpoint
ALTER TABLE "public"."quote_requests"
  ADD CONSTRAINT "quote_requests_purge_images_scope_check"
  CHECK ("purge_scope" IS DISTINCT FROM 'images' OR "status" = 'not_scheduled');
--> statement-breakpoint
ALTER TABLE "public"."quote_requests"
  ADD CONSTRAINT "quote_requests_scheduled_purge_check"
  CHECK ("status" <> 'scheduled' OR "purge_scope" IS NOT DISTINCT FROM 'all');
--> statement-breakpoint
ALTER TABLE "public"."quote_requests"
  ADD CONSTRAINT "quote_requests_not_scheduled_consent_check"
  CHECK ("status" <> 'not_scheduled' OR "contact_retention_consent_accepted_at" IS NOT NULL OR "purge_scope" IS NOT DISTINCT FROM 'all');
--> statement-breakpoint
ALTER TABLE "public"."quote_requests"
  ADD CONSTRAINT "quote_requests_purge_attempts_check"
  CHECK ("purge_attempts" >= 0);
--> statement-breakpoint
ALTER TABLE "public"."quote_requests"
  ADD CONSTRAINT "quote_requests_purge_last_error_check"
  CHECK ("purge_last_error" IS NULL OR "purge_last_error" ~ '^[A-Za-z0-9_.:-]{1,80}$');
--> statement-breakpoint

CREATE INDEX "quote_requests_purge_pending_idx"
  ON "public"."quote_requests" ("purge_attempts", "purge_last_attempt_at")
  WHERE "purge_requested_at" IS NOT NULL;
