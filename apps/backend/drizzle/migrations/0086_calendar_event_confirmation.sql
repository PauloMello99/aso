-- 0086 — Confirmação de agendamento por link (Bloco B, fatia 1).
-- Decisões:
--   * O ciclo de confirmação vive em colunas PRÓPRIAS de calendar_events, separado de
--     "status" (scheduled|canceled): a resposta do cliente nunca altera o status do evento
--     nem libera o horário na agenda.
--   * Só o hash sha256 (hex) do token é guardado (confirmation_token_hash); o token em claro
--     existe apenas no link enviado por e-mail. Um token válido por evento.
--   * customer_email é o e-mail do cliente informado no agendamento (pode diferir do cadastro).
--   * Tudo NULL por padrão: eventos existentes e eventos sem ciclo permanecem inalterados.
-- RLS: as policies de calendar_events permanecem inalteradas. A autorização das novas colunas
--   (quem pode ler/gravar hash e carimbos) é feita na aplicação (ADR-0021), nunca pelo cliente.
-- Rollback: o down descarta as colunas e o tipo; e-mails e estados de confirmação já
--   registrados são PERDIDOS de forma irreversível.
DO $$ BEGIN
  CREATE TYPE "calendar_event_confirmation_status" AS ENUM ('pending', 'confirmed', 'canceled_by_customer');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "customer_email" text;
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "confirmation_status" "calendar_event_confirmation_status";
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "confirmation_token_hash" text;
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "confirmation_requested_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "confirmation_sent_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "confirmation_responded_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "customer_reminder_sent_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_confirmation_consistency_check" CHECK (
  ("confirmation_status" IS NULL AND "confirmation_token_hash" IS NULL)
  OR ("confirmation_status" IS NOT NULL AND "customer_email" IS NOT NULL AND "confirmation_requested_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_events_confirmation_token_hash_uq" ON "calendar_events" ("confirmation_token_hash") WHERE "confirmation_token_hash" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_customer_reminder_due_idx" ON "calendar_events" ("starts_at") WHERE "confirmation_status" = 'pending' AND "customer_reminder_sent_at" IS NULL;
