-- 0042 — 3ª rodada de revisão de segurança sobre tickets (achados restantes do
-- database-guardian após a 0041):
-- 1) sla_first_response_due_at / sla_resolution_due_at são NOT NULL sem DEFAULT,
--    e a policy de INSERT da 0041 só consegue checar valores fornecidos pelo
--    cliente — não consegue impor "computado pelo servidor". Um tenant podia
--    inserir um ticket já com o SLA que quisesse (ex.: prazo no passado, nunca
--    violável, etc). Adicionado BEFORE INSERT TRIGGER que, para callers NÃO
--    privilegiados (mesma allowlist de is_super_admin()/rolsuper/rolbypassrls
--    da 0041), sobrescreve os dois campos calculando a partir de
--    ticket_categories.sla_*_minutes + now(), e força created_by := NULL.
--    NOTA IMPORTANTE (decisão de arquitetura para os use-cases): com este
--    trigger, created_by de um ticket criado via app_user/DRIZZLE (portal
--    tenant) SEMPRE fica NULL no banco — não há como o use-case de create
--    setar a autoria real no mesmo INSERT, porque o trigger zera
--    incondicionalmente para não-privilegiados (não dá para diferenciar "author
--    genuíno setado pelo backend" de "author forjado pelo client" só olhando o
--    valor). O próximo passo (create-ticket use-case) precisa escolher entre:
--    (a) gravar created_by em INSERT separado via DRIZZLE_ADMIN na mesma
--    transação (como a fila admin já faz em outros fluxos), ou (b) aceitar
--    created_by sempre NULL para criação via tenant e usar requester_email/
--    requester_name (não tocados por este trigger) como identificação. Esta
--    migration não resolve isso — só constata e documenta.
-- 2) ticket_attachments.storage_path não era validado contra o prefixo
--    "{org_id}/..." no INSERT — um tenant podia inserir um attachment
--    apontando para um path de storage de outra organização (a linha em si
--    seria da própria org, mas o storage_path referenciado não). Adicionado
--    "AND storage_path LIKE (org_id::text || '/%')" ao WITH CHECK da policy.
-- 3) Achado 3 da rodada anterior (DRIZZLE_ADMIN/postgres sem rolbypassrls
--    verificado) foi CONFIRMADO EMPIRICAMENTE como já resolvido: consulta
--    direta ao Postgres local mostra rolbypassrls=true para a role postgres,
--    logo a allowlist da 0041 (protect_ticket_privileged_columns) já cobre
--    esse caminho. Sem mudança de schema aqui — nota de deploy: confirmar o
--    mesmo (rolbypassrls=true) na role usada por DRIZZLE_ADMIN em produção
--    antes de promover esta migration.

-- FIX 1 — BEFORE INSERT trigger: SLA computado no servidor + created_by forçado a NULL
-- para callers não privilegiados.
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
--> statement-breakpoint

-- FIX 2 — ticket_attachments_insert: validar storage_path contra o prefixo "{org_id}/...".
DROP POLICY IF EXISTS "ticket_attachments_insert" ON "ticket_attachments";
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
