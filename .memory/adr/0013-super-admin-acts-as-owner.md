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
- **Auditoria das ações fica para PLAT-3** (pendente) — sem trilha de quem/o quê/quando ainda.
- O helper roda só no miss path → custo zero no fluxo do membro comum.

## Relacionado

- ADR-0005 (RLS + `is_super_admin()`), ADR-0012 (e-mail), PLAT-1 (painel super_admin).
- `.memory/domain-rules.md` (Multi-tenancy / roles).
