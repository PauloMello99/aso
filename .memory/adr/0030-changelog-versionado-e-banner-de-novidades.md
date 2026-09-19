# ADR-0030 — Changelog versionado no repositório + banner de novidades (Bloco 5.2, fatia B)

**Status:** Aceito
**Data:** 2026-09-19

## Contexto

Bloco 5.2 do backlog da reunião de **2026-09-15**: refatorar o onboarding de forma modular e ter um
**changelog versionado** que avise os usuários de novidades (e, numa fatia posterior, dispare e-mail aos
donos quando o item for relevante). Esta ADR cobre a **fatia B**: o catálogo + banner in-app. As fatias C
(e-mail aos donos) e A (tour modular por módulos pendentes) têm plano em `.claude/scratch/plano-bloco5-2.md`.

## Decisões

### 1. Fonte dos itens = arquivo versionado no repo, não tabela

`apps/backend/src/modules/changelog/domain/changelog-entries.ts` (`CHANGELOG_ENTRIES`, ordem `version` DESC).
Item = conteúdo de PRODUTO, não de tenant: passa por code review, versiona junto da feature que anuncia,
não precisa de RLS, editor rich-text nem sanitização (lição do `campaigns`). Alternativa descartada: tabela +
CRUD de super_admin (~2x o trabalho, ganho só de publicar sem deploy — a feature anunciada só existe após o
deploy). Todo item do catálogo histórico é `notifyOwners: false` (spec obriga; nunca dispara e-mail retroativo).
`module` é tipado por `CHANGELOG_MODULE_HREFS` (hrefs de `ORG_NAV_SECTIONS` no frontend — `nav.ts` é a fonte do
vocabulário; o frontend falha ABERTO em href desconhecido, por isso o teste garante a pertença).

### 2. Estado "visto" = high-water mark inteiro em `users`

`users.changelog_seen_version integer NULL` (migration 0079). `version` é inteiro monotônico; NULL = nunca viu.
Coluna em `users` (não tabela): estado 1:1 com o usuário; as policies de `users` (0000: `auth.uid() = auth_id OR
is_super_admin()`) já escopam a própria linha; sem helper `current_user_id()` no banco. Nota do guardian: no
banco, `users_select_same_org` (0015) expõe a linha a pares de org — a coluna só guarda marcador NÃO sensível.
RLS não confina por coluna: o confinamento é aplicacional (`updateChangelogSeenVersion` é a ÚNICA via de escrita
e o campo NUNCA deve entrar em `UpdateUserData`).

### 3. API: `GET /changelog` e `POST /changelog/seen` (autenticadas, NÃO org-scoped)

GET devolve `{ entries, seenVersion, latestVersion }` sem filtrar por audience: `role` é por organização e o
mesmo usuário pode ser owner numa org e employee noutra, logo audience não é computável no servidor; o payload é
anúncio de produto. O filtro (`getUnseenEntries`: version > seen, audience 'owners' só para owner,
`canAccessModule` + `roles` do item de nav) é do FRONTEND. POST: aceita `version >= 1`, rejeita
`> latestVersion` (`CHANGELOG_VERSION_INVALID`, 400, em `domain-status.map.ts`); SQL `GREATEST(COALESCE(col,0), v)`
— nunca regride, atômico sob concorrência; `authId` da sessão, nunca do corpo.

### 4. Banner no `OrgLayout`

Mostra o item não visto de maior versão + contador; dispensar marca a maior versão dos itens VISÍVEIS ao usuário
(itens ocultos por permissão não são marcados como vistos). Otimista com rollback em erro. Só rotas de org
(nunca /admin nem públicas). Sem cache longo (a query key não é escopada por usuário; usar o padrão global).

## Consequências / dívidas

- **Pré-requisito de deploy:** `db:migrate` ANTES de subir o backend — código novo contra schema antigo devolve
  42703 em todo login/`GET /users/me` (`findByAuthId` seleciona a coluna nova).
- Trade-off do high-water mark: novidade oculta por permissão abaixo da versão dispensada não reaparece se o
  usuário ganhar a permissão depois (aceito).
- `signOut` não limpa o cache do React Query (pré-existente): troca de conta na mesma aba pode servir o
  `seenVersion` anterior até o refetch.
- A resposta expõe `notifyOwners` e `latestVersion` (o primeiro será consumido na fatia C).
- Migrations 0077-0079 e o `_journal.json` devem ir juntos ao commit (o migrator abre um `.sql` por entrada).
- Não verificado ponta a ponta com um employee real (org de teste só tem o owner) — coberto pelo spec de
  `getUnseenEntries`.
