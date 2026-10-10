-- Reverte 0092.
--
-- Perde a rastreabilidade pedido -> evento e a idempotência do "Agendou". Reverter o
-- código da C3b ANTES de aplicar este down (o use-case depende da coluna).

GRANT INSERT, DELETE ON public.quote_requests TO app_user;
--> statement-breakpoint
GRANT INSERT, UPDATE, DELETE ON public.quote_request_images TO app_user;
--> statement-breakpoint

DROP POLICY IF EXISTS "quote_requests_update" ON public.quote_requests;
--> statement-breakpoint
DROP POLICY IF EXISTS "quote_requests_select" ON public.quote_requests;
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

DROP INDEX IF EXISTS "public"."calendar_events_source_quote_request_uq";
--> statement-breakpoint
ALTER TABLE "public"."calendar_events" DROP COLUMN IF EXISTS "source_quote_request_id";
