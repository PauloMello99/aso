-- Reverte 0089.
--
-- O backfill do módulo 'quotes' em org_memberships.permissions NÃO é revertido:
-- não há como distinguir quem já tinha 'quotes' antes (o owner pode tê-lo
-- ajustado depois). Remover a flag em massa revogaria acessos legítimos; o valor
-- fica inerte sem a caixa de entrada (o módulo só é consultado pelo OrgModuleGuard).

DROP POLICY IF EXISTS "quote_request_images_select" ON public.quote_request_images;
--> statement-breakpoint
DROP POLICY IF EXISTS "quote_requests_update" ON public.quote_requests;
--> statement-breakpoint
DROP POLICY IF EXISTS "quote_requests_select" ON public.quote_requests;
--> statement-breakpoint

-- Restaura o estado anterior (UPDATE de tabela inteira herdado do default privilege da 0003);
-- sem policy, o RLS continua negando qualquer escrita do tenant.
REVOKE UPDATE ("viewed_at") ON public.quote_requests FROM app_user;
--> statement-breakpoint
GRANT UPDATE ON public.quote_requests TO app_user;
--> statement-breakpoint

DROP INDEX IF EXISTS "public"."quote_requests_unread_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "public"."quote_requests_org_created_idx";
--> statement-breakpoint
-- Perda de dado: o estado "visto" dos pedidos some.
ALTER TABLE "public"."quote_requests" DROP COLUMN IF EXISTS "viewed_at";
