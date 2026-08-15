-- 0038 down — remove tickets, ticket_responses, ticket_attachments (nesta ordem, por
-- causa das FKs). ATENÇÃO: dado real de tenant (tickets/respostas/anexos) será perdido
-- se revertido após uso em produção — só é rollback seguro antes do primeiro ticket real.
DROP TABLE IF EXISTS "ticket_attachments";
--> statement-breakpoint
DROP TABLE IF EXISTS "ticket_responses";
--> statement-breakpoint
DROP TABLE IF EXISTS "tickets";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."ticket_author_type";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."ticket_priority";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."ticket_status";
