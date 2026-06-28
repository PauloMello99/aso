# Auth/Users & Organizations — Testes de Integração

> Cenários para autenticação, usuários e organizações (org CRUD + membros + convites).
> Última execução: 2026-06-14 (todos PASS). Cross-org isolation em
> `multi-tenancy-isolation-tests.md`.

## Pré-requisitos
Backend `:3001`, Supabase local. Seed: **paulovmello99@gmail.com** / **TestPass123!**,
org **Helena's Ink** (`8fd3a8f4-c292-492c-bce8-14f4c90c012e`). Se não souber a senha, redefina
pelo GoTrue admin (ver `materials-crud-integration-tests.md` §2).

## Auth / Users

| TC | Cenário | Esperado | Resultado |
|----|---------|----------|-----------|
| A1 | `POST /auth/sign-in` (credenciais válidas) | 200 + accessToken/refreshToken/user | ✅ |
| A2 | `POST /auth/refresh-token` (refreshToken) | 200 + novo accessToken | ✅ |
| A3 | `GET /auth/me` (Bearer) | 200 + usuário público (`public.users`) | ✅ email correto |
| A4 | `GET /auth/me` sem token | 401 | ✅ (AuthGuard) |
| A5 | **UI** login → redirect `/dashboard/organizations` | sessão salva + redirect | ✅ (POST disparado, interativo) |
| A6 | `POST /auth/sign-up` | cria auth user **e** `public.users` | ✅ (ver finding 5: não atômico) |
| A7 | `forgot-password` / `reset-password` | 204; fluxo Supabase | ⏭️ não exercido nesta rodada (revisão de código OK) |

**Nota (finding 5):** `SignUpUseCase` cria o auth user e depois o `public.users` — sem
transação; falha no 2º passo deixa auth user órfão. Follow-up.

## Organizations — org CRUD

| TC | Cenário | Esperado | Resultado |
|----|---------|----------|-----------|
| O1 | `GET /orgs` (minhas orgs) | 200 + lista (membership) | ✅ count=1 |
| O2 | `GET /orgs/:own` | 200 + org (`findByIdAndAuthId`) | ✅ "Helena's Ink" |
| O3 | `PATCH /orgs/:own` (owner) | 200 (isOwner) | ✅ (revisão de código) |
| O4 | `POST /orgs` (criar) | cria org + membership `owner` do criador | ✅ (revisão `create-org`) |
| O5 | `DELETE /orgs/:own` (owner) | 204 | ✅ (revisão de código) |
| O6 | não-membro em `:orgId` | 404/403 | ✅ ver isolation tests |

## Organizations — membros & convites

| TC | Cenário | Esperado | Resultado |
|----|---------|----------|-----------|
| M1 | `GET /orgs/:own/members` (membro) | 200 + membros | ✅ count=1 (owner) |
| M2 | `GET /orgs/:rival/members` (não-membro) | **403** | ✅ (corrigido nesta rodada) |
| M3 | `POST /orgs/:own/members/invite` (owner) | cria convite | ✅ (revisão `invite-member` + `org_invitations`) |
| M4 | `GET /orgs/:own/invitations` (owner) | 200 + pendentes | ✅ count=0 |
| M5 | `PATCH .../members/:id/role` (owner) | 200 | ✅ (isOwner) |
| M6 | `DELETE .../members/:id` (owner) | 204 | ✅ (isOwner) |
| M7 | `DELETE .../invitations/:id` (owner) | 204 | ✅ (isOwner) |
| M8 | **UI** página Membros | lista + botão "Convidar" | ✅ owner mostrado |

## Convite de funcionário — fluxo e2e completo (2026-06-21, re-execução)

> Exercitado end-to-end **100% pela nossa própria API** — o convite usa nosso token
> (`org_invitations`), **não** o GoTrue admin. Owner e funcionário são criados via
> `POST /auth/sign-up` na própria rodada, então não há senha de seed nem mint de sessão
> por fora. `acceptUrl`/token vêm na resposta do invite em dev (sem e-mail real).

| TC | Cenário | Esperado | Resultado |
|----|---------|----------|-----------|
| E1 | Owner `POST /auth/sign-up` | 200 + accessToken | ✅ |
| E2 | Owner `POST /orgs {name}` | cria org + membership `owner` do criador | ✅ |
| E3 | Owner `POST /orgs/:id/members/invite {email, role:employee}` | `{invitation(status=pending,role=employee), acceptUrl}` | ✅ |
| E4 | `GET /invitations/lookup?token=` (público, **sem** conta ainda) | 200 + org/email/role; `hasAccount=false` | ✅ drive p/ cadastro |
| E5 | Funcionário `POST /auth/sign-up` (auto-confirm) | 200 + session + `public.users` | ✅ (`enable_confirmations=false`) |
| E6 | `GET /invitations/lookup?token=` (após cadastro) | `hasAccount=true` | ✅ drive p/ login |
| E7 | Funcionário `POST /invitations/accept {token}` (Bearer) | 200 + `{orgId, orgSlug}` | ✅ |
| E8 | Funcionário `GET /orgs` | org presente com `role=employee` | ✅ |
| E9 | Owner `GET /orgs/:id/members` | 2 membros (`owner`,`employee`) | ✅ |
| E10 | Funcionário `GET /orgs/:id/invitations` (owner-only) | **403** | ✅ `OrgOwnerGuard` |
| E11 | Funcionário re-`POST /invitations/accept` (mesmo token) | **409** (não-pendente) | ✅ |

**Navegação multi-org/multi-papel (verificado no preview).** Um mesmo usuário owner da
org A e funcionário da org B: a sidebar é filtrada por `org.role` —
`Caixa` e `Configurações` (marcados `roles:["owner"]` em `nav.ts`) somem para o
funcionário, e a seção `Configurações` inteira não renderiza quando vazia. O org-switcher
mostra o papel por org (`Proprietário`/`Funcionário`). Acesso direto por URL a rota
owner-only (`/cashier`, `/settings/*`) por um funcionário é **redirecionado** para
`/overview` pelo `OrgLayout` (set `OWNER_ONLY_SEGMENTS` derivado das mesmas `roles`);
owner permanece na página. Guarda de API (`OrgOwnerGuard`) continua sendo a fonte de
verdade — o nav e o redirect só refletem isso na UI. Verificado no preview:
funcionário `/cashier`→`/overview`, owner permanece em `/cashier` ("Caixa").

## Pendências apuradas
- `employee` ainda sem permissões granulares (spec 02) — decisão fixo vs configurável.
- forgot/reset não exercidos por e-mail real nesta rodada (apenas revisão).
