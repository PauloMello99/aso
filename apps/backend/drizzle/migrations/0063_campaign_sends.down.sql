-- Reverte 0063. Ordem obrigatória: a tabela PRIMEIRO, os tipos DEPOIS (os enums são
-- referenciados pelas colunas "trigger" e "status", então DROP TYPE antes da tabela
-- falharia). Os índices caem junto com a tabela — não precisam de DROP explícito.
DROP TABLE IF EXISTS public.campaign_sends;
--> statement-breakpoint
DROP TYPE IF EXISTS public.campaign_send_status;
--> statement-breakpoint
DROP TYPE IF EXISTS public.campaign_trigger_type;
