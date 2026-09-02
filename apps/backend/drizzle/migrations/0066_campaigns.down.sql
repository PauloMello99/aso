-- Reverte 0066. A tabela "campaigns" é nova e nasce vazia nesta migration (sem backfill),
-- então o rollback é limpo: DROP TABLE descarta tudo. Os DROP POLICY explícitos são
-- belt-and-braces (as policies cairiam junto com a tabela) e mantêm a simetria com o .sql.
-- O enum "public.campaign_trigger_type" NÃO é dropado: ele pertence à 0063.
DROP POLICY IF EXISTS "campaigns_delete" ON public.campaigns;
--> statement-breakpoint
DROP POLICY IF EXISTS "campaigns_update" ON public.campaigns;
--> statement-breakpoint
DROP POLICY IF EXISTS "campaigns_insert" ON public.campaigns;
--> statement-breakpoint
DROP POLICY IF EXISTS "campaigns_select" ON public.campaigns;
--> statement-breakpoint
DROP TABLE IF EXISTS public.campaigns;
