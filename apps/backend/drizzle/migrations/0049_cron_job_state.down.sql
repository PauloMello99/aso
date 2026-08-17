-- Reverte 0049. Perde só o metadado de agendamento (quando cada job rodou
-- pela última vez) — na volta, o primeiro tick após reverter roda o job
-- de self-throttling uma vez a mais do que o necessário. Aceitável: nenhum
-- dado de negócio (dinheiro, assinatura, cupom) é perdido por este rollback.
DROP TABLE IF EXISTS "cron_job_state" CASCADE;
