-- ============================================================================
-- 0003 — Role dedicada para RLS defense-in-depth (ADR-0005).
--
-- As políticas RLS e os helpers (`is_super_admin`, `is_org_member`,
-- `is_org_owner`) JÁ EXISTEM desde a migration 0000 e são baseados em
-- `auth.uid()` (lê o claim `sub` de `request.jwt.claims`). O que faltava para
-- o isolamento valer também no caminho do backend era o backend NÃO conectar
-- com um papel que dá BYPASSRLS.
--
-- Esta migration cria `app_user` (LOGIN, NOBYPASSRLS). O backend conecta como
-- `app_user` e, por request, executa
--     SELECT set_config('request.jwt.claims', '{"sub":"<auth_id>","role":"authenticated"}', true)
-- dentro de uma transação — assim `auth.uid()` resolve para o usuário do request
-- e as políticas de 0000 passam a valer. `postgres`/`service_role` mantêm
-- BYPASSRLS para migrations e operações de bootstrap.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_user_dev' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_user;
--> statement-breakpoint
GRANT USAGE ON SCHEMA auth TO app_user;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;
--> statement-breakpoint
-- Fechar lacuna: `stock_movements` tem org_id mas ficou sem RLS na 0000.
-- Ledger append-only → membros leem e inserem; sem update/delete pela aplicação.
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "stock_movements_select" ON public.stock_movements;
--> statement-breakpoint
DROP POLICY IF EXISTS "stock_movements_insert" ON public.stock_movements;
--> statement-breakpoint
CREATE POLICY "stock_movements_select" ON public.stock_movements
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "stock_movements_insert" ON public.stock_movements
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));
