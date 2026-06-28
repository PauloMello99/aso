-- Rollback 0003 — remove a role dedicada (as políticas/helpers de 0000 ficam).
DROP POLICY IF EXISTS "stock_movements_select" ON public.stock_movements;
DROP POLICY IF EXISTS "stock_movements_insert" ON public.stock_movements;
ALTER TABLE public.stock_movements DISABLE ROW LEVEL SECURITY;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE USAGE, SELECT ON SEQUENCES FROM app_user;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM app_user;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_user;
REVOKE ALL ON SCHEMA public FROM app_user;
REVOKE ALL ON SCHEMA auth FROM app_user;
DROP ROLE IF EXISTS app_user;
