# ADR-0021 — Escritas privilegiadas do portal de suporte via `DRIZZLE_ADMIN` escopado (autorização por coluna não é modelável só em RLS)

**Data**: 2026-08-10
**Status**: Aceito

## Contexto

O módulo `support` (canal de suporte B2B, Fatia A: portal autenticado + fila de
atendimento admin + SLA + anexos + notificações por e-mail, sem formulário público)
tem uma característica nova no projeto: **múltiplas classes de ator escrevem na mesma
tabela `tickets`** pelo mesmo pool de conexão RLS (`DRIZZLE`/`app_user`) — o tenant
(cliente do estúdio, via portal) só pode setar um subconjunto de colunas (subject,
description, category) e nunca `status`, `priority`, `assigned_agent_id`,
`created_by`, ou qualquer timestamp de SLA/ciclo de vida; essas são exclusivas do
agente (super_admin, via fila admin) ou do sistema (cron de SLA, `reopen-ticket` do
próprio portal recalculando SLA de resolução).

RLS no Postgres autoriza por **linha** (aqui, por `org_id` via `is_org_member`/
`is_super_admin`), não por **coluna**. Quando o mesmo `INSERT`/`UPDATE`, na mesma
conexão, pode legitimamente vir tanto do tenant quanto do backend agindo em nome do
sistema, a policy não tem como distinguir "campo setado legitimamente pelo backend"
de "campo forjado pelo cliente" — os dois chegam como o mesmo `app_user` autenticado
como membro da mesma org.

### Tentativas via RLS/trigger (modelagem base 0038; correções 0039 → 0041 → 0042, revertidas na 0043)

- **0038** — modelagem inicial: `tickets`/`ticket_responses`/`ticket_attachments` com
  RLS simples (`is_super_admin() OR is_org_member(org_id)`) em SELECT/INSERT/UPDATE,
  sem nenhuma proteção de coluna.
- **0039** — 1ª rodada de correção (revisão pós-0038): `ticket_responses_select`
  passou a excluir `is_internal_note=true` do tenant; `ticket_responses_insert` passou
  a exigir `author_type='customer'` e `is_internal_note=false` do tenant; um `BEFORE
  UPDATE TRIGGER` (`protect_ticket_privileged_columns`, `SECURITY DEFINER`) passou a
  clampar as colunas privilegiadas de `tickets` de volta ao valor antigo (`NEW.status
  := OLD.status` etc.) para qualquer `session_user <> 'app_user'`.
- **0041** — 2ª rodada (o trigger da 0039 tinha um furo: `session_user` via PostgREST
  chega como `authenticator`/`SET ROLE authenticated`, nem `app_user` nem admin, então
  passava sem proteção): trocado de denylist por allowlist explícita
  (`rolsuper`/`rolbypassrls` via `pg_roles` + `is_super_admin()`), de `SECURITY
  DEFINER` para `SECURITY INVOKER`, e de clamp silencioso para `RAISE EXCEPTION
  (42501)`. `tickets_insert` ganhou o mesmo `WITH CHECK` de colunas privilegiadas.
  `ticket_responses_insert`/`ticket_attachments_insert` passaram a confirmar que
  `ticket_id` pertence ao `org_id` informado (fechando spoofing cross-org).
- **0042** — 3ª rodada: como `sla_*_due_at` são `NOT NULL` sem `DEFAULT`, a policy de
  INSERT só validava o que o cliente mandasse, sem conseguir impor "computado pelo
  servidor". Adicionado um 2º `BEFORE INSERT TRIGGER`
  (`compute_ticket_sla_on_insert`) que recalcula o SLA a partir de
  `ticket_categories` e **zera `created_by` incondicionalmente** para não-privilegiados
  — e aí a própria migration documenta o beco sem saída: não há como o trigger
  diferenciar "`created_by` setado de verdade pelo backend em nome do tenant" de
  "forjado pelo cliente", então zera sempre. Isso quebra a autoria real de tickets
  criados pelo portal.

A cada rodada, o `database-guardian` encontrava um furo novo na tentativa anterior
(role do PostgREST não coberta, INSERT sem as mesmas restrições do UPDATE, spoofing
de `ticket_id` cross-org, impossibilidade de computar SLA no servidor sem perder
autoria) — sintoma de que o problema não é um bug pontual de cada policy/trigger, mas
que **a primitiva errada estava sendo usada** para autorização por coluna.

## Decisão

**0043 remove toda a maquinaria de coluna** (os 2 triggers de 0039/0041/0042 e os
predicados de coluna da policy `tickets_insert`) e move a autorização de escrita
privilegiada do portal para a **camada de aplicação**:

- `create-ticket`, `add-customer-response`, `reopen-ticket` e
  `upload-ticket-attachment` (as 4 escritas que o portal do cliente aciona, via
  `SupportController` — `@Controller("orgs/:orgId/support")` com
  `AuthGuard`+`OrgMembershipGuard`) passam a escrever via **`DRIZZLE_ADMIN`**
  (`createAsAdmin`/`updateAsAdmin` nos repositórios `DrizzleTicketRepository`/
  `DrizzleTicketResponseRepository`/`DrizzleTicketAttachmentRepository`), com
  **`org_id` vindo do path `/orgs/:orgId/*`, autorizado pelo `OrgMembershipGuard`
  antes de chegar no use-case** (nunca aceito de um campo livre no body) — o
  use-case, não o banco, decide o que o tenant pode setar: `CreateTicketUseCase`
  monta a entidade só com `subject`/`description`/`categorySystemKey`/`priority` do
  input, calculando `status='open'`, SLA e `createdBy` (do usuário autenticado via
  `GetMeUseCase`, nunca de `requesterName`/`requesterEmail` enviados pelo cliente) no
  próprio código; `AddCustomerResponseUseCase` força `authorType='customer'` e
  `isInternalNote=false` incondicionalmente; `ReopenTicketUseCase` só mexe em
  `status`/`reopenedAt`/SLA de resolução, nunca em campos como `assignedAgentId`;
  `UploadTicketAttachmentUseCase` valida tamanho/mimetype e monta `storagePath`
  sempre como `{orgId}/{ticketId}/{uuid}-{nome}` no servidor.
- **Leituras do portal continuam via `DRIZZLE` normal** (RLS ativa,
  `is_org_member(org_id)`), com filtro explícito de `org_id` no repositório como
  defesa em profundidade (`findByIdInOrg`, `listByTicketInOrg`).
- O que **sobrevive** da maquinaria de RLS por não ser autorização de coluna, mas de
  **linha inteira** (RLS é a primitiva certa para isso): `ticket_responses_select`
  (exclui `is_internal_note=true` na origem) e `ticket_responses_insert`
  (`author_type='customer'` + `is_internal_note=false`, tenant não pode se passar por
  agente/sistema — continua útil como defesa em profundidade mesmo com o portal
  passando a escrever via admin, porque protege qualquer caminho de escrita futuro que
  volte a usar `DRIZZLE`); o guard `storage_path LIKE org_id||'/%'` de
  `ticket_attachments_insert`; o `REVOKE` de `anon`/`authenticated`; os índices; e o
  padrão append-only de `ticket_responses`/`ticket_attachments` (sem policy de
  UPDATE/DELETE).
- **A fila admin (`listAllForAdminQueue`, `findByIdAsAdmin`) e o cron de SLA
  (`listSlaCandidates`, os `updateAsAdmin` do sweep) também usam `DRIZZLE_ADMIN`**,
  mas por um motivo diferente e já coberto pela regra geral existente
  (`domain-rules.md`): são legitimamente **cross-org** (a fila do super_admin lista
  tickets de todas as orgs; o cron não tem contexto de request/sessão nenhum). Isso
  **não** é a mesma motivação da exceção desta ADR — não confundir os dois casos ao
  ler o código do módulo.

## Regra prática para próximos módulos

**Múltiplas classes de ator escrevendo a mesma tabela pelo mesmo pool de conexão
(`DRIZZLE`/`app_user`) é o sinal de alerta.** Quando isso ocorrer — um endpoint
autenticado do "lado cliente" e outro do "lado operador" gravando linhas na mesma
tabela, com colunas que só um dos lados pode setar — **não tente impor a diferença
via RLS/trigger** (autorização por coluna). RLS modela bem autorização por **linha**
(quem pode ver/tocar QUAL linha, tipicamente por `org_id`); tentar fazer o Postgres
diferenciar QUAL CAMPO um ator pode setar dentro da mesma linha, pela mesma conexão,
tende a precisar de trigger com allowlist de role — que funciona, mas é frágil (cada
caminho de acesso real — `app_user` direto, PostgREST `authenticated`/`anon`,
`DRIZZLE_ADMIN`/`service_role` — precisa ser coberto explicitamente, e um esquecido é
um furo silencioso) e multiplica migrations de correção incremental (como visto aqui:
0039 → 0041 → 0042 antes de desistir na 0043).

**Mova a autorização de coluna para a camada de aplicação**: o(s) use-case(s) do lado
restrito (aqui, o portal do cliente) escrevem via `DRIZZLE_ADMIN` **escopado
explicitamente** — `org_id` sempre vindo de uma fonte já autorizada (path `/orgs/:orgId/*`
+ `OrgMembershipGuard`), nunca de um campo livre do body/input do cliente — e o
próprio código do use-case decide quais campos aceitar do input e quais
computar/fixar no servidor (nunca um "spread" do DTO direto na entidade). Isso é uma
exceção **deliberada e escopada** à regra geral "`DRIZZLE_ADMIN` só em bootstrap/
cron/guards" — não uma licença geral para usar `DRIZZLE_ADMIN` sempre que for mais
simples. RLS continua sendo a primitiva certa (e deve ser mantida) para tudo que for
autorização por **linha**: isolamento de tenant nas leituras, e regras de linha
inteira como "nota interna nunca aparece pro tenant" ou "resposta append-only".

## Consequências

- `tickets_update` continua com a forma permissiva original da 0038
  (`USING is_super_admin() OR is_org_member(org_id)`, sem `WITH CHECK` de coluna e sem
  trigger atrás dela) — na prática **inofensivo hoje**, porque o único método de
  update no repositório é `updateAsAdmin` (nenhum caminho do app faz `UPDATE` de
  ticket via `DRIZZLE`/RLS). É uma regressão de defesa-em-profundidade em relação à
  0041 (que tinha o trigger), aceita conscientemente em troca de simplicidade.
- `created_by` volta a ser gravável de verdade no `INSERT` (o trigger da 0042 que o
  zerava incondicionalmente foi removido) — autoria de ticket criado pelo portal
  agora reflete o usuário real da sessão.
- Nenhum teste de integração cobre diretamente "tenant tenta fazer UPDATE cru via
  `DRIZZLE` em `tickets`" pós-0043 — a garantia atual é 100% "nenhum caminho do
  código expõe isso", não mais "o banco também bloquearia".

## Relacionado

- `.memory/domain-rules.md` (Multi-tenancy → RLS/`DRIZZLE_ADMIN`, e seção Support).
- ADR-0005 (multi-tenant single DB + RLS), ADR-0013 (super_admin como owner, outro
  caso de bypass de RLS pela aplicação).
- Migrations `apps/backend/drizzle/migrations/0038` a `0043_tickets_simplify_privileged_writes.sql`
  (o comentário de cabeçalho da 0043 é a fonte primária desta decisão).
