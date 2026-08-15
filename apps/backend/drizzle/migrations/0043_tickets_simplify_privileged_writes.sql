-- 0043 — simplificação deliberada: RLS/trigger não consegue autorizar por coluna de
-- forma confiável quando o mesmo pool de conexão (DRIZZLE/app_user) serve múltiplas
-- classes de ator (customer/agent/system) na mesma tabela — não há como o banco
-- distinguir "campo setado legitimamente pelo backend" de "campo forjado pelo
-- cliente" dentro do mesmo INSERT/conexão. A autorização de escrita privilegiada do
-- portal (create-ticket, resposta do cliente, reabertura) passa a viver na camada de
-- aplicação (use-case), roteando por DRIZZLE_ADMIN com org_id derivado da sessão
-- (RlsContext claims) — mesmo padrão que a fila admin/cron já usa. Isso é uma exceção
-- deliberada à regra geral "DRIZZLE_ADMIN só em bootstrap/cron/guards", a ser
-- formalizada em ADR no fechamento do módulo support (Fatia A, passo 21).
--
-- Removida a maquinaria de coluna que ficou obsoleta com essa mudança de arquitetura:
-- os 2 triggers de proteção/computo de coluna (0041/0042) e os predicados de coluna
-- da policy tickets_insert (0041). O que continua válido e é mantido sem alteração:
-- ticket_responses_select/insert e o guard de storage_path de ticket_attachments_insert
-- (RLS de linha inteira, não de coluna — RLS funciona bem para isso), o REVOKE de
-- anon/authenticated, os índices, e o padrão append-only de ticket_responses/
-- ticket_attachments.

-- Remove o trigger que computava SLA no INSERT (0042) — o cálculo passa a ser feito
-- pelo use-case antes do INSERT via DRIZZLE_ADMIN.
DROP TRIGGER IF EXISTS compute_ticket_sla_on_insert_trigger ON public.tickets;
--> statement-breakpoint
DROP FUNCTION IF EXISTS public.compute_ticket_sla_on_insert();
--> statement-breakpoint

-- Remove o trigger que protegia colunas privilegiadas no UPDATE (0039/0041) — a
-- proteção agora é de arquitetura: só admin/cron mudam esses campos, e passam a
-- usar DRIZZLE_ADMIN; o portal não expõe use-case de UPDATE direto nesses campos.
DROP TRIGGER IF EXISTS protect_ticket_privileged_columns_trigger ON public.tickets;
--> statement-breakpoint
DROP FUNCTION IF EXISTS public.protect_ticket_privileged_columns();
--> statement-breakpoint

-- Reverte tickets_insert para a forma simples (igual 0038), sem os predicados de
-- coluna adicionados na 0041 — esses predicados dependiam do trigger de SLA acima,
-- que não existe mais; a validação de coluna passa a ser responsabilidade do use-case.
DROP POLICY IF EXISTS "tickets_insert" ON "tickets";
--> statement-breakpoint
CREATE POLICY "tickets_insert" ON "tickets" FOR INSERT
  WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));
