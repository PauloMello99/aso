# 02 — Autenticação, Usuários & Papéis · 🟡 Parcial

## Visão
Identidade única por pessoa, com papéis na plataforma e em cada org. Inclui o cadastro de
**funcionários** (profissionais) do estúdio.

## Estado atual (ink-ops)
Módulo `modules/auth` (Supabase como `IAuthProvider`: sign-in/up/out, refresh, forgot/reset,
me) + `AuthGuard` + `features/auth` (login, signup, recover, reset). `users` com `auth_id`
(liga ao Supabase). `org_memberships` define `org_role`. `platform_role` em `users`.
**Membros/convites** existem em `modules/organizations`.

## Legado a portar
`users(isAdmin, isEmployee, name, email, birth_date, gender, address, contact_phone, avatar,
enabled)` — **um único estúdio**, papéis via flags booleanas. Cadastro de funcionários
(`/a/employees`, create/update/**update-status**). `calendar_events` e `services` referenciam
`employee_id` → `users`.

## Decisões das reuniões / memória
**Usuário único, multi-role, multi-org:**
```
Platform User (único por email/auth)
 ├── platform_role: super_admin | user
 └── memberships: Org A (owner|employee), Org B (employee), ...
```
- `super_admin`: tudo do owner + assinaturas, financeiro da plataforma, todas as orgs/users.
- `owner`: gestão total da org. `employee`: acesso conforme permissões (granularidade a definir).
- Ruan/João Pedro = `super_admin` + `owner` da Ink House.

## Comportamento alvo (V1)
1. **Funcionários = membros da org** com `org_role=employee` (substitui `isEmployee`). O
   cadastro de funcionário cria/convida um `user` e um `org_membership`.
2. **Ativo/inativo** do funcionário (`enabled`/status do membership): funcionário inativo
   **não pode** ser vinculado a novos serviços/eventos (regra legada — `EMPLOYEE_DISABLED_ERROR`).
3. **Convites:** portar via `org_invitations` (já existe) — e-mail + papel.
4. **Permissões do employee:** decidir entre fixo por papel (V1) vs granular configurável (futuro).

## Regras de negócio
- 1 `auth_id` ↔ 1 `user`; e-mail único.
- Papel efetivo = `platform_role` + `org_role` da org corrente.
- Funcionário precisa ser membro **ativo** da org para receber serviços/eventos.

## Pendências
- Granularidade de permissões do `employee` (fixo vs configurável).
- Tela de gestão de funcionários (perfil, status) por org.

## Revisão das reuniões (04/06 · 11/06)
> Ver [revisão por módulo §1 e §5](../reunioes/2026-revisao-funcionalidades-por-modulo.md#1-papéis--permissões).
> Status: ✅ feito · 🟡 parcial · ⏳ pendente V1 · 🔮 V2/externo.

- ✅ **Funcionário vê apenas o que é dele** (na V1/legado via tudo como admin); admin vê tudo e
  **pode agir em nome de** qualquer membro. Rotas/abas privadas por papel.
- ⏳ **Super admin (administração global):** poder total sobre qualquer org (corrigir falha
  humana), além de assinaturas/financeiro da plataforma; é a ponte de suporte dev → admin →
  cliente final.
- 🟡 **Funcionários:** não deixar todos desativados (estado do legado); permitir **editar a
  página** do funcionário.
- 🔮 Dashboard/área do funcionário com os próprios indicadores (spec 10).
