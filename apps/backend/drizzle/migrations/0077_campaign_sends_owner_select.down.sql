-- Reverte 0076. Volta ao estado da 0063: RLS habilitado sem nenhuma policy (nega
-- tudo para roles NOBYPASSRLS), só DRIZZLE_ADMIN lê/escreve.
DROP POLICY IF EXISTS "campaign_sends_select" ON public.campaign_sends;
