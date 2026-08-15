-- 0041 down — reverte para o estado exato da 0039/0038.
-- Nota: o GRANT de volta pra anon/authenticated é só por simetria — nenhum
-- código do backend depende dele (todo acesso via RLS/DRIZZLE ou service_role
-- em storage), mas é revertido aqui para não deixar a 0039 e a 0041 em
-- estados de GRANT diferentes.
GRANT ALL ON public.tickets, public.ticket_responses, public.ticket_attachments TO anon, authenticated;
--> statement-breakpoint

DROP INDEX IF EXISTS "tickets_sla_resolution_due_at_idx";
--> statement-breakpoint
CREATE INDEX "tickets_sla_resolution_due_at_idx" ON "tickets" ("sla_resolution_due_at")
  WHERE "resolved_at" IS NULL AND "sla_resolution_breached_at" IS NULL;
--> statement-breakpoint

DROP POLICY IF EXISTS "ticket_attachments_insert" ON "ticket_attachments";
--> statement-breakpoint
CREATE POLICY "ticket_attachments_insert" ON public.ticket_attachments
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint

DROP POLICY IF EXISTS "ticket_responses_insert" ON "ticket_responses";
--> statement-breakpoint
CREATE POLICY "ticket_responses_insert" ON public.ticket_responses
  FOR INSERT WITH CHECK (public.is_super_admin() OR (public.is_org_member(org_id) AND is_internal_note = false AND author_type = 'customer'));
--> statement-breakpoint

DROP POLICY IF EXISTS "tickets_insert" ON "tickets";
--> statement-breakpoint
CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint

DROP TRIGGER IF EXISTS protect_ticket_privileged_columns_trigger ON public.tickets;
--> statement-breakpoint
DROP FUNCTION IF EXISTS public.protect_ticket_privileged_columns();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.protect_ticket_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin() OR session_user <> 'app_user' THEN
    RETURN NEW;
  END IF;

  NEW.status := OLD.status;
  NEW.priority := OLD.priority;
  NEW.assigned_agent_id := OLD.assigned_agent_id;
  NEW.first_response_at := OLD.first_response_at;
  NEW.resolved_at := OLD.resolved_at;
  NEW.closed_at := OLD.closed_at;
  NEW.reopened_at := OLD.reopened_at;
  NEW.sla_first_response_due_at := OLD.sla_first_response_due_at;
  NEW.sla_resolution_due_at := OLD.sla_resolution_due_at;
  NEW.sla_first_response_breached_at := OLD.sla_first_response_breached_at;
  NEW.sla_resolution_breached_at := OLD.sla_resolution_breached_at;
  NEW.sla_warning_notified_at := OLD.sla_warning_notified_at;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER protect_ticket_privileged_columns_trigger
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ticket_privileged_columns();
