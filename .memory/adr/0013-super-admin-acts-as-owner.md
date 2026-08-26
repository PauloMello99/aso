# ADR-0013 — super_admin age como owner de qualquer organização

**Status:** Aceito
**Data:** 2026-06-29
**Origem:** Premissas do produto (camada de administração global / "agir em nome do dono")

## Contexto

O `super_admin` (Assessoria Ink) precisa **gerenciar qualquer org como se fosse o dono** —
entrar no dashboard normal e executar todas as ações de owner (membros, caixa, configurações,
serviços, estoque, agenda, clientes), inclusive destrutivas (excluir org, transferir
titularidade). A **RLS já permitia** super_admin (`public.is_super_admin() OR
is_org_member/owner(org_id)` em toda policy, migrations 0000/0003); o bloqueio era **só na
camada de aplicação**: guards e use-cases exigiam uma linha de membership, e o frontend
resolvia a org pelas memberships do usuário.

## Decisão

**Detectar super_admin no _caminho de miss_** (quando não há membership) — sem penalizar o
caminho do membro comum e sem alterar os ~12 use-cases da org. Fonte única:
`common/auth/is-super-admin.ts` → `isSuperAdmin(db, authId)` (lê `users.platform_role`).

**Backend:**
- **Guards** (`OrgMembershipGuard`, `OrgOwnerGuard`, `OrgModuleGuard`): se a query de
  membership não acha linha e `isSuperAdmin` → autoriza. Membership guard libera **mesmo org
  suspensa** para super_admin.
- **`DrizzleOrgRepository`**: `findByIdAndAuthId`/`findBySlugAndAuthId`/`isOwner` sintetizam
  role `"owner"` no miss path. `findAllByAuthId` (switcher) **não muda** — super_admin não vê
  todas as orgs na lista.
- **`DrizzleMemberRepository.findByAuthId`**: sintetiza um membro owner (`memberId: ""`) →
  cobre transparentemente `resolveActor` (caixa), `resolveMembership` (serviços), overview e
  transfer-ownership. `transfer-ownership` trata o ator sintetizado rebaixando o **owner real**.
- **Deep-link**: novo `GET /orgs/by-slug/:slug` (`ResolveOrgBySlugUseCase`). Não-membro
  sem super_admin → 404 (sem vazar).

**Frontend:**
- super_admin **sempre opera como owner** em qualquer org (`OrgLayout` força `role: "owner"`).
- Banner em 2 níveis: **forte** ("gerenciando como super_admin") quando NÃO é o owner real
  (funcionário ou não-membro); **sutil** ("Acesso de super_admin") quando É o owner real.
- Entrada pelo botão "Gerenciar" no detalhe da org do painel (`/dashboard/org/{slug}`).

## Consequências

- Poder destrutivo real liberado ao super_admin; o **banner é a salvaguarda de UX**.
- **Auditoria do FATO de ter sido síntese de super_admin (PLAT-3, fatia inicial) implementada
  em 2026-08-24** — ver addendum abaixo. A trilha genérica de "quem/o quê/quando" pra toda
  mutação do sistema (não só as via síntese) continua fora do escopo deste ADR.
- O helper roda só no miss path → custo zero no fluxo do membro comum.

## Addendum (2026-08-24): PLAT-3 fatia inicial — marcar auditoria quando a autorização vem da síntese

**Decisão**: quando uma ação é autorizada pelo caminho de miss deste ADR (não por membership
qualificante), os `audit_logs` gravam `metadata.viaSuperAdmin: true`. Semântica exata: "esta
ação foi autorizada por `isSuperAdmin()`", não "o ator não é membro" — um super_admin que É
membro real como employee e aciona a síntese em `isOwner()` (linha de owner ausente) também é
marcado, e isso é intencional (a autorização efetivamente veio da síntese, não da membership
qualificante que ele tem).

**Onde a marcação acontece** (arquitetura escolhida: sinal de ambiente via
`AsyncLocalStorage`, não parâmetro passado por controllers/use-cases — os ~12 use-cases da org
e seus controllers continuam com diff zero):
- `apps/backend/src/common/request-context/acting-context.ts` — `AsyncLocalStorage` PRÓPRIO
  (não reaproveita o `rlsStorage` de `database.module.ts`, que hospeda o proxy de SAVEPOINT da
  transação de request). Exporta `runWithActingContext`, `markActingAsSuperAdmin`,
  `isActingAsSuperAdmin`.
- Escrita: nos 4 pontos de síntese em repositório (`DrizzleOrgRepository.findByIdAndAuthId`/
  `findBySlugAndAuthId`/`isOwner`, `DrizzleMemberRepository.findByAuthId`) — é onde a
  autorização das mutações de org REALMENTE acontece (confirmado por leitura direta:
  `OrgsController` só tem `AuthGuard` de classe, as mutações autorizam dentro do use-case via
  `orgRepo.isOwner()`) — e, redundantemente, nos 3 guards (`OrgOwnerGuard`,
  `OrgMembershipGuard`, `OrgModuleGuard`) que escrevem `request.actingAsSuperAdmin = true` (só
  eles conseguem, porque guards rodam ANTES de interceptors no ciclo do Nest, fora do ALS).
- Leitura: só em `AuditService.log()`, capturada SINCRONAMENTE antes de `registerPostCommit`
  (o hook pós-commit roda DEPOIS do `COMMIT` real, fora da janela em que o contexto síncrono
  de uma chamada comum ainda é garantido — capturar antes é a garantia robusta).
- Ponte guard → ALS: `RlsInterceptor` envolve `RlsContext.runWithClaims(...)` POR FORA com
  `runWithActingContext(request.actingAsSuperAdmin === true, ...)` — crítico que seja por
  fora, porque os hooks pós-commit do `AuditService` rodam dentro do corpo de `runWithClaims`,
  depois do `COMMIT`.

**Sem migration**: `audit_logs.metadata` já é jsonb; a chave nova é aditiva, sem coluna/índice
novo nesta fatia. Se um filtro por esse campo no painel de auditoria for necessário no futuro,
promover a coluna dedicada + índice é o próximo passo natural (não feito aqui).

**Frontend**: `apps/frontend/src/features/admin/components/admin-audit-logs.tsx` mostra um
badge "via super_admin" na célula do ator quando `metadata.viaSuperAdmin === true`.

**Exclusão conhecida e deliberada**: `OrgMembershipGuard` tem um segundo bypass de super_admin
que NÃO passa por `isSuperAdmin()` nem é marcado — quando o super_admin já É membro real
(owner ou employee) de uma org **suspensa**, o guard libera pelo campo `membership.
platformRole === "super_admin"` direto na query (não pelo caminho de miss deste ADR). Só o
caso super_admin-owner-real-de-org-suspensa fica sem `viaSuperAdmin` (o caso employee é
recapturado depois em `isOwner()`, que sintetiza owner por não achar linha com role="owner").
Decisão: não marcar esse ramo — ele não é síntese de owner (a membership É real), é um bypass
de suspensão diferente; misturar as duas semânticas no mesmo campo confundiria mais do que
ajudaria. Registro aqui para que o campo `viaSuperAdmin` nunca seja lido como "toda ação de
super_admin fica marcada" — só marca o caminho de miss deste ADR.

## Relacionado

- ADR-0005 (RLS + `is_super_admin()`), ADR-0012 (e-mail), PLAT-1 (painel super_admin).
- `.memory/domain-rules.md` (Multi-tenancy / roles).
