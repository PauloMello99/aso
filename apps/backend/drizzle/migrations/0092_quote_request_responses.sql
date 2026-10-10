-- 0092 — Respostas do pedido de orçamento "Agendou"/"Não agendou" (Bloco C, fatia C3b).
--
-- Decisões não óbvias:
--   (i)   `calendar_events.source_quote_request_id` é uuid SEM FK, de propósito: o pedido
--         é purgado após a resposta, e a referência opaca (sem PII) precisa sobreviver a ele.
--   (ii)  O índice único parcial (org_id, source_quote_request_id) garante 1 evento por
--         pedido (retry depois de falha do hook pós-commit e duplo clique concorrente
--         caem em 23505, convertido em 409 pelo repositório do calendário).
--   (iii) As policies de quote_requests passam a esconder pedidos encerrados ou com purga
--         pendente (status <> 'new' ou purge_requested_at preenchido): defesa em
--         profundidade do filtro da aplicação (ADR-0038, recomendação 5). As imagens
--         herdam o predicado pelo EXISTS de quote_request_images_select (inalterada).
--   (iv)  REVOKE de INSERT/DELETE em quote_requests e de INSERT/UPDATE/DELETE em
--         quote_request_images: só o DRIZZLE_ADMIN escreve nelas (rota pública, close-and-claim,
--         purga) e as ações referenciais em cascata rodam como dono da tabela, ignorando
--         o GRANT do app_user. O GRANT UPDATE ("viewed_at") da 0089 permanece.
--   (v)   calendar_events já tem GRANT de tabela para o app_user; a coluna nova não
--         precisa de GRANT adicional.

ALTER TABLE "public"."calendar_events"
  ADD COLUMN "source_quote_request_id" uuid;
--> statement-breakpoint

CREATE UNIQUE INDEX "calendar_events_source_quote_request_uq"
  ON "public"."calendar_events" ("org_id", "source_quote_request_id")
  WHERE "source_quote_request_id" IS NOT NULL;
--> statement-breakpoint

DROP POLICY IF EXISTS "quote_requests_select" ON public.quote_requests;
--> statement-breakpoint
DROP POLICY IF EXISTS "quote_requests_update" ON public.quote_requests;
--> statement-breakpoint
CREATE POLICY "quote_requests_select" ON public.quote_requests
  FOR SELECT USING (
    (
      public.is_super_admin()
      OR public.is_org_owner(org_id)
      OR public.is_self_member(org_id, target_user_id)
    )
    AND status = 'new'
    AND purge_requested_at IS NULL
  );
--> statement-breakpoint
CREATE POLICY "quote_requests_update" ON public.quote_requests
  FOR UPDATE USING (
    (
      public.is_super_admin()
      OR public.is_org_owner(org_id)
      OR public.is_self_member(org_id, target_user_id)
    )
    AND status = 'new'
    AND purge_requested_at IS NULL
  )
  WITH CHECK (
    (
      public.is_super_admin()
      OR public.is_org_owner(org_id)
      OR public.is_self_member(org_id, target_user_id)
    )
    AND status = 'new'
    AND purge_requested_at IS NULL
  );
--> statement-breakpoint

REVOKE INSERT, DELETE ON public.quote_requests FROM app_user;
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON public.quote_request_images FROM app_user;
