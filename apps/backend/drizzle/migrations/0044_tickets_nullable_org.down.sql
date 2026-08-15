-- 0044 down — bloqueia rollback destrutivo: se existir linha órfã (org_id IS NULL) em
-- QUALQUER uma das 3 tabelas — não só tickets, mas também ticket_responses/
-- ticket_attachments (um vínculo que atualizou o pai e esqueceu os filhos deixaria
-- órfão só nos filhos) — reverter para NOT NULL apagaria/corromperia dado real do
-- usuário. É preciso vincular os órfãos a uma organização (fila admin) ou removê-los
-- manualmente antes de reverter.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tickets WHERE org_id IS NULL)
    OR EXISTS (SELECT 1 FROM public.ticket_responses WHERE org_id IS NULL)
    OR EXISTS (SELECT 1 FROM public.ticket_attachments WHERE org_id IS NULL)
  THEN
    RAISE EXCEPTION 'Rollback bloqueado: existem linhas orfas (org_id IS NULL) em tickets, ticket_responses ou ticket_attachments. Vincule-as a uma organizacao pela fila admin ou remova-as manualmente antes de reverter a 0044.';
  END IF;
END $$;
--> statement-breakpoint

DROP INDEX IF EXISTS "tickets_orphan_created_at_idx";
--> statement-breakpoint

-- ── RLS POLICIES — restaura o estado exato do fim da Fatia A (pós-0043) ────────────
DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
--> statement-breakpoint
CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint

DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
--> statement-breakpoint
CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint

DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
--> statement-breakpoint
CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint

DROP POLICY IF EXISTS "ticket_responses_select" ON public.ticket_responses;
--> statement-breakpoint
CREATE POLICY "ticket_responses_select" ON "ticket_responses" FOR SELECT
  USING (public.is_super_admin() OR (public.is_org_member(org_id) AND is_internal_note = false));
--> statement-breakpoint

DROP POLICY IF EXISTS "ticket_responses_insert" ON public.ticket_responses;
--> statement-breakpoint
CREATE POLICY "ticket_responses_insert" ON "ticket_responses" FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_org_member(org_id)
      AND is_internal_note = false
      AND author_type = 'customer'
      AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.org_id = ticket_responses.org_id)
    )
  );
--> statement-breakpoint

DROP POLICY IF EXISTS "ticket_attachments_select" ON public.ticket_attachments;
--> statement-breakpoint
CREATE POLICY "ticket_attachments_select" ON public.ticket_attachments
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint

DROP POLICY IF EXISTS "ticket_attachments_insert" ON public.ticket_attachments;
--> statement-breakpoint
CREATE POLICY "ticket_attachments_insert" ON "ticket_attachments" FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_org_member(org_id)
      AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.org_id = ticket_attachments.org_id)
      AND storage_path LIKE (org_id::text || '/%')
    )
  );
--> statement-breakpoint

-- ── Schema: org_id volta a ser obrigatório ─────────────────────────────────────────
ALTER TABLE "tickets" ALTER COLUMN "org_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ticket_responses" ALTER COLUMN "org_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ticket_attachments" ALTER COLUMN "org_id" SET NOT NULL;
