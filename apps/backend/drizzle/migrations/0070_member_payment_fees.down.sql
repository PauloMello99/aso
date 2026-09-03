-- Reverte 0070.
--
-- ATENÇÃO — perda de dado irreversível se rodado DEPOIS de já existirem
-- lançamentos com taxa calculada: os snapshots gravados em transactions.fee_*
-- (e o vínculo de auditoria fee_config_id) são apagados junto com as colunas.
-- Não há como reconstruir o snapshot original a partir de
-- org_member_payment_fees, porque a config apontada pode já ter sido
-- superseded, e a caixa é append-only (ADR-0010) — não se reescreve um
-- lançamento. Só reverta esta migration se NENHUM lançamento com taxa foi
-- registrado ainda.

-- Triggers/funções novas primeiro (Postgres não faz dependency-tracking de
-- corpo plpgsql — se a coluna/tabela some antes, um trigger sobrevivente
-- dispara em runtime em QUALQUER UPDATE seguinte na tabela).
DROP TRIGGER IF EXISTS org_member_payment_fees_protect_immutable ON "public"."org_member_payment_fees";
--> statement-breakpoint
DROP FUNCTION IF EXISTS public.protect_member_payment_fee_immutable_fields();
--> statement-breakpoint

-- Nota: o GRANT de volta é só por simetria (mesmo padrão da 0051) — nenhum
-- código do backend depende dele (acesso via RLS/DRIZZLE).
GRANT ALL ON public.org_member_payment_fees TO anon, authenticated;
--> statement-breakpoint

DROP POLICY IF EXISTS "org_member_payment_fees_update" ON public.org_member_payment_fees;
--> statement-breakpoint
DROP POLICY IF EXISTS "org_member_payment_fees_insert" ON public.org_member_payment_fees;
--> statement-breakpoint
DROP POLICY IF EXISTS "org_member_payment_fees_select" ON public.org_member_payment_fees;
--> statement-breakpoint

ALTER TABLE IF EXISTS public.org_member_payment_fees DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE "public"."transactions" DROP CONSTRAINT IF EXISTS "transactions_fee_config_id_org_member_payment_fees_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."transactions" DROP CONSTRAINT IF EXISTS "transactions_fee_source_check";
--> statement-breakpoint

ALTER TABLE "public"."transactions" DROP COLUMN IF EXISTS "fee_source";
--> statement-breakpoint
ALTER TABLE "public"."transactions" DROP COLUMN IF EXISTS "fee_fixed_cents";
--> statement-breakpoint
ALTER TABLE "public"."transactions" DROP COLUMN IF EXISTS "fee_percent";
--> statement-breakpoint
ALTER TABLE "public"."transactions" DROP COLUMN IF EXISTS "fee_config_id";
--> statement-breakpoint

DROP INDEX IF EXISTS "org_member_payment_fees_org_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "org_member_payment_fees_org_user_method_active_uq";
--> statement-breakpoint

ALTER TABLE "org_member_payment_fees" DROP CONSTRAINT IF EXISTS "org_member_payment_fees_active_superseded_check";
--> statement-breakpoint

DROP TABLE IF EXISTS "public"."org_member_payment_fees" CASCADE;
