-- 0043 down — reverte para o estado exato da 0042.

DROP POLICY IF EXISTS "tickets_insert" ON "tickets";
--> statement-breakpoint
CREATE POLICY "tickets_insert" ON "tickets" FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_org_member(org_id)
      AND status = 'open'
      AND assigned_agent_id IS NULL
      AND first_response_at IS NULL
      AND resolved_at IS NULL
      AND closed_at IS NULL
      AND reopened_at IS NULL
      AND sla_first_response_breached_at IS NULL
      AND sla_resolution_breached_at IS NULL
      AND sla_warning_notified_at IS NULL
    )
  );
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.protect_ticket_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF public.is_super_admin() OR EXISTS (
    SELECT 1 FROM pg_roles r WHERE r.rolname = current_user AND (r.rolsuper OR r.rolbypassrls)
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
    OR NEW.priority IS DISTINCT FROM OLD.priority
    OR NEW.assigned_agent_id IS DISTINCT FROM OLD.assigned_agent_id
    OR NEW.first_response_at IS DISTINCT FROM OLD.first_response_at
    OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
    OR NEW.closed_at IS DISTINCT FROM OLD.closed_at
    OR NEW.reopened_at IS DISTINCT FROM OLD.reopened_at
    OR NEW.sla_first_response_due_at IS DISTINCT FROM OLD.sla_first_response_due_at
    OR NEW.sla_resolution_due_at IS DISTINCT FROM OLD.sla_resolution_due_at
    OR NEW.sla_first_response_breached_at IS DISTINCT FROM OLD.sla_first_response_breached_at
    OR NEW.sla_resolution_breached_at IS DISTINCT FROM OLD.sla_resolution_breached_at
    OR NEW.sla_warning_notified_at IS DISTINCT FROM OLD.sla_warning_notified_at
    OR NEW.org_id IS DISTINCT FROM OLD.org_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ticket privileged columns are not writable by tenant';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS protect_ticket_privileged_columns_trigger ON public.tickets;
--> statement-breakpoint
CREATE TRIGGER protect_ticket_privileged_columns_trigger
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ticket_privileged_columns();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.compute_ticket_sla_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_first_response_minutes integer;
  v_resolution_minutes integer;
BEGIN
  IF public.is_super_admin() OR EXISTS (
    SELECT 1 FROM pg_roles r WHERE r.rolname = current_user AND (r.rolsuper OR r.rolbypassrls)
  ) THEN
    RETURN NEW;
  END IF;

  SELECT sla_first_response_minutes, sla_resolution_minutes
    INTO v_first_response_minutes, v_resolution_minutes
    FROM public.ticket_categories
    WHERE id = NEW.category_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'invalid ticket category';
  END IF;

  NEW.sla_first_response_due_at := now() + make_interval(mins => v_first_response_minutes);
  NEW.sla_resolution_due_at := now() + make_interval(mins => v_resolution_minutes);
  NEW.created_by := NULL;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS compute_ticket_sla_on_insert_trigger ON public.tickets;
--> statement-breakpoint
CREATE TRIGGER compute_ticket_sla_on_insert_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_ticket_sla_on_insert();
