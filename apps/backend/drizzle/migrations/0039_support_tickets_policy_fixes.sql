-- 0039 — Correções de segurança encontradas na revisão da 0038 (support tickets):
-- 1) ticket_responses_select vazava notas internas (is_internal_note) para o tenant.
-- 2) ticket_responses_insert permitia que o tenant se passasse por agent/system e
--    marcasse a própria resposta como nota interna.
-- 3) tickets_update permitia que o tenant alterasse colunas privilegiadas (status,
--    priority, assigned_agent_id, timestamps de SLA/ciclo de vida) do próprio ticket —
--    protegido agora via BEFORE UPDATE TRIGGER. Diferente de RLS, um trigger roda para
--    QUALQUER role, inclusive a role dona das tabelas usada por DRIZZLE_ADMIN — por isso
--    a função exclui explicitamente `session_user <> 'app_user'` (ver comentário junto à
--    função abaixo para o raciocínio completo).
--    ATENÇÃO (constatação para os próximos passos, não resolvida nesta migration):
--    o use-case reopen-ticket do portal precisa alterar status e reopened_at — como o
--    trigger zera essas colunas para não-super-admin, esse use-case não poderá ser um
--    UPDATE simples via DRIZZLE (RLS). Ele terá que usar DRIZZLE_ADMIN (como a fila
--    admin/cron) ou o trigger precisará abrir uma exceção específica para essa
--    transição. Decisão de arquitetura para o passo de use-cases, não desta migration.
-- 4) Índices adicionais de suporte a queries (attachments por ticket/response, tickets
--    por status+created_at, fila de SLA pendente de resolução).

-- FIX 1 — ticket_responses_select: nunca vazar nota interna para o tenant.
DROP POLICY IF EXISTS "ticket_responses_select" ON "ticket_responses";
--> statement-breakpoint
CREATE POLICY "ticket_responses_select" ON "ticket_responses" FOR SELECT
  USING (public.is_super_admin() OR (public.is_org_member(org_id) AND is_internal_note = false));
--> statement-breakpoint

-- FIX 2 — ticket_responses_insert: tenant só pode inserir resposta como customer,
-- nunca como agent/system, e nunca marcada como nota interna.
DROP POLICY IF EXISTS "ticket_responses_insert" ON "ticket_responses";
--> statement-breakpoint
CREATE POLICY "ticket_responses_insert" ON "ticket_responses" FOR INSERT
  WITH CHECK (public.is_super_admin() OR (public.is_org_member(org_id) AND is_internal_note = false AND author_type = 'customer'));
--> statement-breakpoint

-- FIX 3 — tickets_update: bloquear alteração de colunas privilegiadas por não-super-admin.
-- IMPORTANTE: BEFORE UPDATE TRIGGER roda para QUALQUER role, inclusive a role dona das
-- tabelas usada por DRIZZLE_ADMIN (fila admin/cron) — diferente de RLS, trigger não é
-- automaticamente ignorado por quem bypassa RLS. is_super_admin() sozinho não cobre esse
-- caso: DRIZZLE_ADMIN não seta request.jwt.claims, então auth.uid() é NULL e
-- is_super_admin() retorna false. Por isso a exceção verifica explicitamente a role de
-- sessão: só a role restrita `app_user` (criada em 0003_rls_policies, NOBYPASSRLS,
-- usada exclusivamente pela conexão DRIZZLE/RLS) sofre o clamp; qualquer outra role
-- (ex.: a role dona das tabelas usada por DRIZZLE_ADMIN) e claims de super_admin passam
-- direto. Usa session_user (não current_user) porque a função é SECURITY DEFINER — dentro
-- dela current_user passaria a ser o dono da função, não quem chamou.
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
--> statement-breakpoint

-- FIX 4 — índices adicionais.
CREATE INDEX "ticket_attachments_ticket_id_created_at_idx" ON "ticket_attachments" ("ticket_id", "created_at");
--> statement-breakpoint
CREATE INDEX "ticket_attachments_response_id_idx" ON "ticket_attachments" ("response_id") WHERE "response_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "tickets_status_created_at_idx" ON "tickets" ("status", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX "tickets_sla_resolution_due_at_idx" ON "tickets" ("sla_resolution_due_at") WHERE "resolved_at" IS NULL AND "sla_resolution_breached_at" IS NULL;
