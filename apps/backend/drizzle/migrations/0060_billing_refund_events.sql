-- 0060 — T4-F3 (fatia 1/6): espelho administrativo de reembolsos do Stripe. Cria o enum
-- de status e a tabela append-only "billing_refund_events". Não há entity/repo/use-case
-- ainda — as fatias seguintes plugam a persistência e o consumo do webhook.
--
--   (a) Append-only: UMA LINHA POR STATUS DISTINTO alcançado por um refund
--       (pending → requires_action → succeeded/failed/canceled). Reentrada no mesmo
--       status é deduplicada por design — a unicidade
--       "billing_refund_events_refund_status_uq" (stripe_refund_id, status) existe para
--       o writer usar onConflictDoNothing e reprocessar webhook sem duplicar. NUNCA
--       UPDATE/DELETE de linha — correção é sempre linha nova, mesmo espírito do caixa
--       append-only (ADR-0010) e de billing_invoice_events (0033). O dedupe primário de
--       evento continua sendo stripe_webhook_events (PK = event.id, 0033).
--       "occurred_at" DEVE ser o event.created do envelope do webhook que carregou a
--       transição (quando observamos a mudança), NÃO refund.created — senão as linhas do
--       mesmo refund empatam e a linha do tempo fica não-ordenável.
--   (b) Sem FK para "organizations": o webhook de refund pode chegar antes de a org
--       existir no nosso banco (ou nunca mapear 1:1 com um org_id local). "org_id" é
--       nullable e sem REFERENCES — resolvido best-effort pelo writer, nunca uma
--       barreira para registrar o evento.
--   (c) ENABLE ROW LEVEL SECURITY sem nenhuma policy: tabela puramente administrativa.
--       RLS habilitado sem policy bloqueia por padrão qualquer role sujeita a RLS
--       (authenticated/anon); só DRIZZLE_ADMIN (bypassrls) grava/lê. Se algum dia o
--       admin-panel precisar ler via RLS direto, uma policy de SELECT terá de ser
--       adicionada — deixado em aberto, mesmo raciocínio de billing_invoice_events.
--   (d) Ordenação de deploy (mesma nota do 0059, adaptada para tabela nova): a tabela é
--       lida/escrita pelo repositório Drizzle das próximas fatias, que emite lista
--       EXPLÍCITA de colunas no .select(). Esta migration DEVE ser aplicada ANTES do
--       deploy da app que referencia a tabela; o rollback só é seguro DEPOIS de
--       reverter essa app (senão o .select() referencia uma tabela/coluna inexistente).
CREATE TYPE "public"."billing_refund_event_status" AS ENUM('pending', 'requires_action', 'succeeded', 'failed', 'canceled');
--> statement-breakpoint
CREATE TABLE "billing_refund_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_refund_id" text NOT NULL,
	"stripe_charge_id" text,
	"org_id" uuid,
	"status" "billing_refund_event_status" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"reason" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_refund_events_refund_status_uq" UNIQUE("stripe_refund_id","status")
);
--> statement-breakpoint
CREATE INDEX "billing_refund_events_org_occurred_idx" ON "billing_refund_events" ("org_id","occurred_at" DESC);
--> statement-breakpoint
-- Espelho administrativo de eventos de refund; sem policy de leitura via RLS por ora
-- — admin-panel deve ler via DRIZZLE_ADMIN, não via RLS direto do app_user. O REVOKE
-- é defesa em profundidade (convenção das migrations 0041/0045/0051/0052): RLS sem
-- policy já nega tudo para roles NOBYPASSRLS, mas se uma policy for adicionada no
-- futuro os grants default do Supabase não devem reabrir a tabela sem revisão.
ALTER TABLE "billing_refund_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON "billing_refund_events" FROM "anon", "authenticated";
