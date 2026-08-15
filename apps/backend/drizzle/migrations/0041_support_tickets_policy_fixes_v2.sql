-- 0041 — 2ª rodada de revisão de segurança sobre a 0039 (support tickets):
-- 1) protect_ticket_privileged_columns_trigger: a 0039 usava denylist (checava
--    `session_user <> 'app_user'` e clampava colunas silenciosamente para
--    QUALQUER outra role). Isso não cobre o caminho da Data API/PostgREST do
--    Supabase: conexões via PostgREST chegam como session_user='authenticator'
--    com `SET ROLE authenticated`/`anon` — nem 'app_user' nem 'postgres', logo
--    passavam pelo clamp sem proteção alguma (denylist com furo). Trocado para
--    allowlist explícita por atributo de role (rolsuper/rolbypassrls via
--    pg_roles, cobrindo DRIZZLE_ADMIN/service_role) + is_super_admin() via
--    claims, e de SECURITY DEFINER para SECURITY INVOKER — com INVOKER,
--    current_user reflete corretamente quem está executando de fato (o
--    problema do session_user apontado na 0039 era específico de DEFINER).
--    Também trocado de clamp silencioso para RAISE EXCEPTION (42501): clamp
--    silencioso mascara tentativa de escrita indevida em vez de rejeitá-la.
-- 2) tickets_insert não tinha as mesmas restrições de colunas privilegiadas do
--    trigger de UPDATE — um tenant podia inserir um ticket já com status
--    diferente de 'open', assigned_agent_id preenchido, SLA já marcado como
--    violado, etc. Recriada com WITH CHECK explícito.
-- 3) ticket_responses_insert / ticket_attachments_insert confiavam apenas no
--    org_id da própria linha, sem confirmar que o ticket_id referenciado
--    pertence a esse mesmo org_id — um tenant podia inserir resposta/anexo
--    com org_id = próprio (passando is_org_member) mas ticket_id de outro
--    tenant, poluindo/vazando dados na fila admin (que faz join por ticket).
-- 4) tickets_sla_resolution_due_at_idx incluía tickets fechados sem terem
--    sido resolvidos (closed sem resolved_at), fazendo o cron de SLA varrer
--    linhas que não deveriam mais entrar na fila de resolução pendente.
-- 5) Defesa em profundidade: REVOKE explícito de anon/authenticated nas 3
--    tabelas. RLS já é a proteção primária, mas a Data API do Supabase
--    concede GRANT por padrão a esses roles — reduzir a superfície é barato.

-- FIX 1 — trigger allowlist + SECURITY INVOKER (cobre PostgREST authenticated/anon).
DROP TRIGGER IF EXISTS protect_ticket_privileged_columns_trigger ON public.tickets;
--> statement-breakpoint
DROP FUNCTION IF EXISTS public.protect_ticket_privileged_columns();
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
CREATE TRIGGER protect_ticket_privileged_columns_trigger
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ticket_privileged_columns();
--> statement-breakpoint

-- FIX 2 — tickets_insert: mesmas restrições de colunas privilegiadas do trigger de UPDATE.
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

-- FIX 3 — ticket_responses_insert / ticket_attachments_insert: confirmar que
-- ticket_id referenciado pertence ao org_id informado (evita spoofing cross-org).
DROP POLICY IF EXISTS "ticket_responses_insert" ON "ticket_responses";
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

-- FIX 4 — índice de SLA de resolução: excluir tickets fechados sem terem sido resolvidos.
DROP INDEX IF EXISTS "tickets_sla_resolution_due_at_idx";
--> statement-breakpoint
CREATE INDEX "tickets_sla_resolution_due_at_idx" ON "tickets" ("sla_resolution_due_at")
  WHERE "resolved_at" IS NULL AND "closed_at" IS NULL AND "sla_resolution_breached_at" IS NULL;
--> statement-breakpoint

-- FIX 5 — defesa em profundidade: reduzir superfície de GRANT default da Data API.
REVOKE ALL ON public.tickets, public.ticket_responses, public.ticket_attachments FROM anon, authenticated;
