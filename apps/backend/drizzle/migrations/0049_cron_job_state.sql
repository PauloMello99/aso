-- 0049 — módulo financeiro (super_admin): estado de execução de cron
-- (self-throttling). O cron do projeto bate em POST /internal/cron/tick a
-- cada */15 min, disparando todos os jobs juntos (Promise.all) — não há
-- agendamento individual por job. cron_job_state guarda quando cada job
-- rodou pela última vez, permitindo que um job específico (ex: reconciliação
-- de catálogo a cada 3 dias) decida pular a execução se ainda não passou o
-- intervalo desejado, mesmo sendo chamado a cada tick.
--
-- Tabela puramente operacional/interna, sem conceito de organização — RLS
-- habilitado sem nenhuma policy (mesmo padrão de billing_plans/
-- stripe_webhook_events): bloqueia por padrão qualquer role sujeita a RLS
-- (authenticated/anon); só DRIZZLE_ADMIN (bypassrls) acessa.
CREATE TABLE "cron_job_state" (
	"job_name" text PRIMARY KEY NOT NULL,
	"last_run_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cron_job_state" ENABLE ROW LEVEL SECURITY;
