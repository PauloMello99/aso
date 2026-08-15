-- 0039 down — reverte para o estado exato da 0038.
DROP INDEX IF EXISTS "tickets_sla_resolution_due_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "tickets_status_created_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "ticket_attachments_response_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "ticket_attachments_ticket_id_created_at_idx";
--> statement-breakpoint
DROP TRIGGER IF EXISTS protect_ticket_privileged_columns_trigger ON public.tickets;
--> statement-breakpoint
DROP FUNCTION IF EXISTS public.protect_ticket_privileged_columns();
--> statement-breakpoint
DROP POLICY IF EXISTS "ticket_responses_insert" ON "ticket_responses";
--> statement-breakpoint
CREATE POLICY "ticket_responses_insert" ON public.ticket_responses
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
DROP POLICY IF EXISTS "ticket_responses_select" ON "ticket_responses";
--> statement-breakpoint
CREATE POLICY "ticket_responses_select" ON public.ticket_responses
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
