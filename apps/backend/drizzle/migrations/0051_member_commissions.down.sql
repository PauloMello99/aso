-- Reverte 0051.
--
-- ATENÇÃO — perda de dado irreversível se rodado DEPOIS de já existirem
-- pagamentos de comissão: os snapshots gravados em services.commission_* (e o
-- vínculo de auditoria commission_config_id) são apagados junto com as
-- colunas. Não há como reconstruir o snapshot original a partir de
-- org_member_commissions, porque a config pode já ter sido superseded.
-- Só reverta esta migration se NENHUM atendimento com comissão calculada
-- foi registrado ainda.

-- Triggers/funções novas primeiro (Postgres não faz dependency-tracking de
-- corpo plpgsql — se a coluna/tabela some antes, um trigger sobrevivente
-- dispara em runtime em QUALQUER UPDATE seguinte na tabela).
DROP TRIGGER IF EXISTS services_protect_commission_columns ON public.services;
DROP FUNCTION IF EXISTS public.protect_service_commission_columns();

DROP TRIGGER IF EXISTS org_member_commissions_protect_immutable ON public.org_member_commissions;
DROP FUNCTION IF EXISTS public.protect_commission_config_immutable_fields();

-- Nota: o GRANT de volta é só por simetria (mesmo padrão da 0041) — nenhum
-- código do backend depende dele (acesso via RLS/DRIZZLE).
GRANT ALL ON public.org_member_commissions TO anon, authenticated;

DROP POLICY IF EXISTS "org_member_commissions_update" ON public.org_member_commissions;
DROP POLICY IF EXISTS "org_member_commissions_insert" ON public.org_member_commissions;
DROP POLICY IF EXISTS "org_member_commissions_select" ON public.org_member_commissions;

ALTER TABLE IF EXISTS public.org_member_commissions DISABLE ROW LEVEL SECURITY;

ALTER TABLE "services" DROP CONSTRAINT IF EXISTS "services_commission_config_id_org_member_commissions_id_fk";

ALTER TABLE "services" DROP COLUMN IF EXISTS "commission_cents";
ALTER TABLE "services" DROP COLUMN IF EXISTS "commission_base_cents";
ALTER TABLE "services" DROP COLUMN IF EXISTS "commission_mode";
ALTER TABLE "services" DROP COLUMN IF EXISTS "commission_percent";
ALTER TABLE "services" DROP COLUMN IF EXISTS "commission_config_id";

DROP INDEX IF EXISTS "org_member_commissions_org_idx";
DROP INDEX IF EXISTS "org_member_commissions_org_user_active_uq";

ALTER TABLE "org_member_commissions" DROP CONSTRAINT IF EXISTS "org_member_commissions_active_superseded_check";

DROP TABLE IF EXISTS "org_member_commissions" CASCADE;
