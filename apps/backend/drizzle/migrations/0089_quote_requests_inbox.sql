-- 0089 — Caixa de entrada de orçamentos (Bloco C, fatia C2): leitura autenticada
-- dos pedidos recebidos pelo formulário público + marcação "visto".
--
-- Decisões não óbvias:
--   (i)   `quote_requests`/`quote_request_images` não tinham NENHUMA policy
--         (0087, deny-by-default). A C2 cria SELECT (e UPDATE só de quote_requests):
--         super_admin e owner da org veem TODOS os pedidos; o funcionário só os
--         endereçados a ele (`is_self_member(org_id, target_user_id)`, que também
--         exige membership habilitada). INSERT/DELETE continuam sem policy: só
--         DRIZZLE_ADMIN escreve (rota pública) e a expiração/limpeza vem em C3.
--   (ii)  Imagens herdam a visibilidade do pedido via EXISTS em quote_requests
--         (a subquery roda sob o RLS do próprio invocador), sem duplicar o predicado.
--   (iii) UPDATE restrito por COLUNA: o app_user recebeu UPDATE de tabela inteira
--         via ALTER DEFAULT PRIVILEGES (0003). REVOKE + GRANT UPDATE (viewed_at)
--         garante que, mesmo com a policy de UPDATE, a sessão do tenant só consegue
--         alterar `viewed_at` (nome/telefone/e-mail/ideia/consentimento/expiração
--         ficam imutáveis para o tenant). O DRIZZLE_ADMIN (dono da tabela) não é afetado.
--   (iv)  `viewed_at` é por pedido (não por usuário): o owner abrir um pedido
--         endereçado a um funcionário o marca como visto também para ele.
--   (v)   Backfill idempotente: funcionários existentes ganham o módulo `quotes`
--         (DEFAULT_EMPLOYEE_PERMISSIONS passa a incluí-lo; sem isso a caixa de
--         entrada ficaria invisível para quem já está na org). Owner ignora a lista.
--   (vi)  `is_org_owner` (0000) só checa role='owner' (sem `enabled`) e org_memberships
--         não tem trigger — o UPDATE do backfill não dispara nada.

ALTER TABLE "public"."quote_requests"
  ADD COLUMN "viewed_at" timestamp with time zone;
--> statement-breakpoint

-- Listagem do owner (todos os pedidos da org, mais recentes primeiro).
CREATE INDEX "quote_requests_org_created_idx"
  ON "public"."quote_requests" ("org_id", "created_at" DESC);
--> statement-breakpoint
-- Contagem de não lidos (badge): parcial, só pedidos ainda não vistos.
CREATE INDEX "quote_requests_unread_idx"
  ON "public"."quote_requests" ("org_id", "target_user_id")
  WHERE "viewed_at" IS NULL;
--> statement-breakpoint

CREATE POLICY "quote_requests_select" ON public.quote_requests
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_org_owner(org_id)
    OR public.is_self_member(org_id, target_user_id)
  );
--> statement-breakpoint
CREATE POLICY "quote_requests_update" ON public.quote_requests
  FOR UPDATE USING (
    public.is_super_admin()
    OR public.is_org_owner(org_id)
    OR public.is_self_member(org_id, target_user_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_org_owner(org_id)
    OR public.is_self_member(org_id, target_user_id)
  );
--> statement-breakpoint
CREATE POLICY "quote_request_images_select" ON public.quote_request_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_images.quote_request_id
        AND qr.org_id = quote_request_images.org_id
    )
  );
--> statement-breakpoint

REVOKE UPDATE ON public.quote_requests FROM app_user;
--> statement-breakpoint
GRANT UPDATE ("viewed_at") ON public.quote_requests TO app_user;
--> statement-breakpoint

UPDATE public.org_memberships
  SET permissions = array_append(permissions, 'quotes')
  WHERE role = 'employee'
    AND NOT ('quotes' = ANY (permissions));
