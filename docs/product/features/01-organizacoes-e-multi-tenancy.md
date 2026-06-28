# 01 — Organizações & Multi-tenancy · 🟡 Parcial

## Visão
A plataforma é **multiempresa**: cada **organização** = um estúdio, com dados totalmente
isolados. Acima das orgs há uma **camada de administração global** (Assessoria Ink).

## Estado atual (ink-ops)
Módulo `modules/organizations` (orgs, members, invitations) + `features/organizations` +
`features/dashboard` (org switcher, layout, sidebar). Tabelas `organizations`, `org_memberships`,
`org_invitations`. Rotas `/dashboard/org/[orgId]/...`. `OrgMembershipGuard` recém-adicionado
protege recursos por org. Onboarding `cadastro → cria org → (billing) → acessa`.

## Legado a portar
**Nenhum** — o `ink-house-studio` é **single-studio** (sem `org_id`). A migração consiste em
**colocar `org_id` em tudo** e isolar por org. Esse é o maior trabalho arquitetural da V1.

## Decisões das reuniões
- Cada org: proprietário, administradores, funcionários, clientes, agenda, serviços, estoque,
  caixa, relatórios — **independentes**.
- **Administração global** (super admin) para suporte, auditoria, manutenção e gestão de orgs.
- **V1:** 1 org criada por usuário; cobrança de múltiplas orgs é futuro.
- **Ambientes** separados dev/homologação/produção (infra, não feature).

## Comportamento alvo (V1)
1. **Isolamento:** todo dado de estúdio carrega `org_id`; RLS no Supabase + `OrgMembershipGuard`
   no backend (defesa em profundidade). Ver ADR-0005.
2. **Criação de org:** fluxo único; acesso liberado **após billing** (spec 11).
3. **Painel global (super_admin):** listar/gerenciar orgs, usuários, assinaturas, financeiro da
   plataforma, feature flags globais (spec 13).
4. **Limite V1:** 1 org criada por owner (membership em N orgs permitido).

## Regras de negócio
- Nenhum recurso "global" sem `org_id` (exceto catálogos do super_admin e flags globais).
- Acesso a `/orgs/:orgId/*` exige membership (guard).

## Pendências
- Painel super_admin (telas) — ainda não implementado.
- Modelo de cobrança para múltiplas orgs (futuro).

## Revisão das reuniões (04/06 · 11/06)
> Ver [revisão por módulo §0 e §1](../reunioes/2026-revisao-funcionalidades-por-modulo.md#0-produto-estratégia-e-arquitetura-0406).
> Status: ✅ feito · 🟡 parcial · ⏳ pendente V1 · 🔮 V2/externo.

- ✅ **Multitenant white-label**: nova plataforma (não reaproveita código legado); **Ink House =
  1ª organização** (migrar dados da Ink House para a plataforma).
- ⏳ **Super admin (administração global):** poder total sobre qualquer org + agir "em nome de"
  (corrigir falha humana) + suporte (ponte dev → admin → cliente final). Painel ainda não existe.
- 🟡 **Ambientes** dev/staging/produção + fluxo **protótipo → aprovação → produção** (validar com
  estúdios convidados antes de produção).
- ⏳ **Suporte:** manual/próximo no início (WhatsApp/visita) → depois FAQ/docs/canais.
