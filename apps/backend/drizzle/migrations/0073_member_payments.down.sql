-- Reverte 0072.
--
-- ATENÇÃO — perda de dado irreversível se rodado DEPOIS de já existirem
-- pagamentos registrados: o vínculo append-only entre transação e membro
-- beneficiário some junto com a tabela, e não há como reconstruí-lo a partir
-- de `transactions` (que permanece agnóstica de membro, ADR-0026 §1). Só
-- reverta esta migration se NENHUM pagamento a membro foi registrado ainda.

-- Trigger/função primeiro (Postgres não faz dependency-tracking de corpo
-- plpgsql — se a tabela some antes, um trigger sobrevivente dispara em
-- runtime em qualquer UPDATE seguinte, mesmo padrão da 0070.down.sql).
DROP TRIGGER IF EXISTS org_member_payments_reject_update ON "public"."org_member_payments";
--> statement-breakpoint
DROP FUNCTION IF EXISTS public.reject_org_member_payments_update();
--> statement-breakpoint

-- Nota: o GRANT de volta é só por simetria (mesmo padrão da 0070) — nenhum
-- código do backend depende dele (acesso via RLS/DRIZZLE).
GRANT ALL ON public.org_member_payments TO anon, authenticated;
--> statement-breakpoint

DROP POLICY IF EXISTS "org_member_payments_insert" ON public.org_member_payments;
--> statement-breakpoint
DROP POLICY IF EXISTS "org_member_payments_select" ON public.org_member_payments;
--> statement-breakpoint

ALTER TABLE IF EXISTS public.org_member_payments DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Sem CASCADE deliberadamente: se algo passar a depender desta tabela no
-- futuro, o down deve FALHAR ALTO em vez de derrubar silenciosamente. Os
-- índices/CHECK constraints próprios da tabela (org_user_idx, reverses_uq,
-- transaction_uq, os três CHECKs) não precisam de DROP explícito — somem
-- junto com a tabela.
DROP TABLE IF EXISTS "public"."org_member_payments";
--> statement-breakpoint

-- Só depois de remover org_member_payments (dono da FK composta
-- transaction_id+org_id que depende desta constraint) é que
-- transactions_id_org_id_uq pode ser dropada — mesma ordem do precedente
-- customers_id_org_id_uq (0052.down.sql): dependentes primeiro, constraint
-- por último. IF EXISTS porque é constraint em tabela que esta migration não
-- dropa.
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_id_org_id_uq;
