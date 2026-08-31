-- Reverte 0060. Ordem obrigatória: a tabela primeiro, o tipo depois (o enum é
-- referenciado pela coluna "status", então DROP TYPE antes da tabela falharia).
-- Só reverta DEPOIS de reverter a app que referencia billing_refund_events (nota (d)
-- do up). O índice cai junto com a tabela — não precisa de DROP INDEX explícito.
DROP TABLE IF EXISTS "billing_refund_events";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."billing_refund_event_status";
