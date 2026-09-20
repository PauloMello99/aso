-- Reverte 0082. AVISO CRÍTICO: apagar "changelog_notifications" destrói o log de dedupe
-- e o PRÓXIMO TICK REENVIA todo item notificável a todos os donos elegíveis. Em produção,
-- desligar via kill-switch CHANGELOG_ANNOUNCEMENTS_ENABLED em vez de fazer rollback.
-- O opt-out (users.product_updates_opted_out_at, 0081) NÃO é tocado aqui.
-- Ordem inversa: tabela, e o tipo por último (a tabela referencia o enum).
DROP TABLE IF EXISTS public.changelog_notifications CASCADE;
--> statement-breakpoint
DROP TYPE IF EXISTS public.changelog_notification_status;
