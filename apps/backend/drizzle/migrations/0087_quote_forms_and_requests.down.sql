-- Reverte 0087.
--
-- ATENÇÃO — perda de dado irreversível: as linhas de quote_requests e
-- quote_request_images (orçamentos recebidos) somem junto com as tabelas. Os
-- objetos já enviados ao bucket 'quote-request-images' NÃO são removidos por
-- este down (o Supabase bloqueia DELETE cru em storage.objects). Em produção,
-- prefira manter a flag PUBLIC_QUOTE_FORM_ENABLED desligada a rodar o down.

-- Sem CASCADE deliberadamente: se algo passar a depender destas tabelas, o down
-- deve FALHAR ALTO. Dependentes primeiro (imagens -> pedidos -> formulários).
DROP TABLE IF EXISTS "public"."quote_request_images";
--> statement-breakpoint
DROP TABLE IF EXISTS "public"."quote_requests";
--> statement-breakpoint
-- As policies de quote_forms somem junto com a tabela; a função só pode ser
-- removida depois dela (as policies a referenciam).
DROP TABLE IF EXISTS "public"."quote_forms";
--> statement-breakpoint
DROP FUNCTION IF EXISTS public.is_self_member(uuid, uuid);
