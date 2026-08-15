-- 0044 — Support M1c (fatia C, primeiro passo): habilita tickets/ticket_responses/
-- ticket_attachments SEM organização (tickets órfãos), base para o formulário público
-- de suporte e o ingestor de e-mail-to-ticket (passos seguintes desta fatia). Até aqui
-- (Fatia A) org_id era NOT NULL nas 3 tabelas — um ticket só existia dentro de um
-- tenant. Um ticket órfão nasce sem org_id, fica visível apenas para super_admin (fila
-- de triagem) e é vinculado a uma organização depois (não tratado nesta migration).
--
-- Todas as policies abaixo ramificam EXPLICITAMENTE em "org_id IS NULL" vs
-- "org_id IS NOT NULL" — a forma implícita (deixar o NULL cair naturalmente na 3VL do
-- Postgres, onde "org_id = <algo>" ou "is_org_member(org_id)" simplesmente avalia para
-- NULL/false e USING/WITH CHECK trata NULL como "não passa") funcionaria para bloquear
-- acesso indevido, mas é frágil e ilegível: fica implícito demais QUEM deveria enxergar
-- órfãos (só super_admin) e o comportamento correto depende de quem lê saber de cor como
-- o Postgres trata NULL em predicado booleano. A forma explícita torna a intenção auditável
-- a cada leitura da migration, ao custo de mais texto — trade-off deliberado dado que este
-- é o módulo de MAIOR risco de tenancy do projeto (dado sem organização, por definição).

-- ── Schema: org_id passa a aceitar NULL ────────────────────────────────────────────
ALTER TABLE "tickets" ALTER COLUMN "org_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "ticket_responses" ALTER COLUMN "org_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "ticket_attachments" ALTER COLUMN "org_id" DROP NOT NULL;
--> statement-breakpoint

-- Índice parcial para a fila de triagem do super_admin (tickets órfãos por data).
CREATE INDEX "tickets_orphan_created_at_idx" ON "tickets" ("created_at" DESC) WHERE "org_id" IS NULL;
--> statement-breakpoint

-- ── RLS POLICIES — tickets ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
--> statement-breakpoint
CREATE POLICY "tickets_select" ON public.tickets FOR SELECT USING (
  (org_id IS NULL AND public.is_super_admin())
  OR (org_id IS NOT NULL AND (public.is_super_admin() OR public.is_org_member(org_id)))
);
--> statement-breakpoint

-- INSERT de ticket órfão é EXCLUSIVO de DRIZZLE_ADMIN (form público / e-mail): nenhum
-- caminho via DRIZZLE/app_user (tenant autenticado) pode criar linha sem org — por isso
-- esta policy, diferente de tickets_select/tickets_update, não tem ramo "org_id IS NULL".
DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
--> statement-breakpoint
CREATE POLICY "tickets_insert" ON public.tickets FOR INSERT WITH CHECK (
  org_id IS NOT NULL AND (public.is_super_admin() OR public.is_org_member(org_id))
);
--> statement-breakpoint

-- WITH CHECK explícito em UPDATE (diferente da 0038, que só tinha USING): impede que um
-- tenant "orfanize" o próprio ticket setando org_id := NULL, e que o vínculo de um ticket
-- órfão a uma organização seja feito por outro caminho que não seja o use-case dedicado
-- (que roda via DRIZZLE_ADMIN, coberto por is_super_admin()/bypass, não por esta policy).
DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
--> statement-breakpoint
CREATE POLICY "tickets_update" ON public.tickets FOR UPDATE
USING (
  (org_id IS NULL AND public.is_super_admin())
  OR (org_id IS NOT NULL AND (public.is_super_admin() OR public.is_org_member(org_id)))
)
WITH CHECK (
  org_id IS NOT NULL AND (public.is_super_admin() OR public.is_org_member(org_id))
);
--> statement-breakpoint

-- ── RLS POLICIES — ticket_responses (append-only: sem UPDATE, sem DELETE) ──────────
-- SELECT: mesma ramificação órfã/tenant de tickets_select, preservando o guard de nota
-- interna (is_internal_note) introduzido na 0039 — super_admin sempre vê tudo (inclusive
-- notas internas e respostas de ticket órfão); tenant só vê resposta pública do próprio org.
DROP POLICY IF EXISTS "ticket_responses_select" ON public.ticket_responses;
--> statement-breakpoint
CREATE POLICY "ticket_responses_select" ON public.ticket_responses FOR SELECT USING (
  (org_id IS NULL AND public.is_super_admin())
  OR (org_id IS NOT NULL AND (public.is_super_admin() OR (public.is_org_member(org_id) AND is_internal_note = false)))
);
--> statement-breakpoint

-- INSERT: mesma exclusividade de DRIZZLE_ADMIN para linha órfã que tickets_insert — resposta
-- de ticket órfão (ex.: e-mail recebido antes da triagem) nasce via DRIZZLE_ADMIN, nunca via
-- app_user. Preserva verbatim os predicados de 0039/0041 (nota interna, author_type,
-- pertencimento cross-org). O predicado de pertencimento usa IS NOT DISTINCT FROM em vez de
-- "=": com org_id IS NOT NULL já garantido acima o comportamento é idêntico a "=" hoje, mas
-- IS NOT DISTINCT FROM é a forma NULL-safe correta caso este predicado seja reaproveitado em
-- um contexto sem essa garantia no futuro.
DROP POLICY IF EXISTS "ticket_responses_insert" ON public.ticket_responses;
--> statement-breakpoint
CREATE POLICY "ticket_responses_insert" ON public.ticket_responses FOR INSERT WITH CHECK (
  org_id IS NOT NULL AND (
    public.is_super_admin()
    OR (
      public.is_org_member(org_id)
      AND is_internal_note = false
      AND author_type = 'customer'
      AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.org_id IS NOT DISTINCT FROM ticket_responses.org_id)
    )
  )
);
--> statement-breakpoint

-- ── RLS POLICIES — ticket_attachments (append-only: sem UPDATE, sem DELETE) ────────
DROP POLICY IF EXISTS "ticket_attachments_select" ON public.ticket_attachments;
--> statement-breakpoint
CREATE POLICY "ticket_attachments_select" ON public.ticket_attachments FOR SELECT USING (
  (org_id IS NULL AND public.is_super_admin())
  OR (org_id IS NOT NULL AND (public.is_super_admin() OR public.is_org_member(org_id)))
);
--> statement-breakpoint

-- INSERT: mesma exclusividade de DRIZZLE_ADMIN para linha órfã. Preserva verbatim o
-- pertencimento cross-org (0041) e o guard de storage_path (0042), ambos tornados NULL-safe:
-- pertencimento via IS NOT DISTINCT FROM (mesmo raciocínio do ticket_responses_insert acima);
-- guard de storage_path via coalesce(org_id::text, 'orphan') no lugar de org_id::text — com
-- org_id IS NOT NULL já garantido pelo AND externo, o ramo 'orphan' do coalesce é
-- INALCANÇÁVEL por esta policy hoje (anexo órfão só nasce via DRIZZLE_ADMIN, que bypassa
-- RLS). Mantido de propósito para o guard continuar correto se algum caminho futuro passar a
-- inserir anexo órfão via RLS comum. O path real usado pelo ingestor de e-mail (passo
-- seguinte desta fatia) é "{orgId ?? 'orphan'}/{ticketId}/{uuid}-{filename}".
DROP POLICY IF EXISTS "ticket_attachments_insert" ON public.ticket_attachments;
--> statement-breakpoint
CREATE POLICY "ticket_attachments_insert" ON public.ticket_attachments FOR INSERT WITH CHECK (
  org_id IS NOT NULL AND (
    public.is_super_admin()
    OR (
      public.is_org_member(org_id)
      AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.org_id IS NOT DISTINCT FROM ticket_attachments.org_id)
      AND storage_path LIKE (coalesce(org_id::text, 'orphan') || '/%')
    )
  )
);
