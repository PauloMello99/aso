-- 0042 down — reverte para o estado exato da 0041.

DROP POLICY IF EXISTS "ticket_attachments_insert" ON "ticket_attachments";
--> statement-breakpoint
CREATE POLICY "ticket_attachments_insert" ON "ticket_attachments" FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_org_member(org_id)
      AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.org_id = ticket_attachments.org_id)
    )
  );
--> statement-breakpoint

DROP TRIGGER IF EXISTS compute_ticket_sla_on_insert_trigger ON public.tickets;
--> statement-breakpoint
DROP FUNCTION IF EXISTS public.compute_ticket_sla_on_insert();
