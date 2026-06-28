---
name: adr-0005-multitenant-single-db-rls
description: Multi-tenancy strategy — single Supabase DB with org_id isolation and PostgreSQL RLS
metadata:
  type: project
---

# ADR-0005: Multi-Tenancy via Single DB + org_id + Row Level Security

**Date:** 2026-06-06
**Status:** Accepted

## Context

ink-ops is a white-label SaaS. Multiple tattoo studios (orgs) share the platform. Their data must be strictly isolated.

## Decision

**Single Supabase project** (single PostgreSQL database). Every domain table carries an `org_id UUID NOT NULL` column. Row Level Security (RLS) policies enforce that users can only read/write rows belonging to their org(s).

Helper functions (SECURITY DEFINER, em `public`, baseadas em `auth.uid()`):
- `is_super_admin()` — checks `platform_role = 'super_admin'` for the current user
- `is_org_member(org_id)` — checks membership in `org_memberships`
- `is_org_owner(org_id)` — checks `role = 'owner'` in `org_memberships`

`auth.uid()` lê o claim `sub` de `request.jwt.claims` (GUC de sessão/transação).
As policies + helpers **já existem desde a migration `0000`** (per-command:
`<tabela>_select/insert/update/delete`). O que faltava era o backend **não**
bypassar RLS — ver "Consequences" / ADR de ativação abaixo.

## Alternatives considered

- **Schema-per-tenant** — Each org gets its own PostgreSQL schema. Rejected: complex migration management, Drizzle doesn't support dynamic schemas cleanly.
- **Database-per-tenant** — Separate Supabase project per org. Rejected: cost, operational overhead, no shared analytics.
- **Application-level filtering only** — No RLS, just WHERE clauses in the backend. Rejected: single bypass bug exposes all data; Supabase Auth already integrates with RLS natively.

## Consequences

- **Every studio table** (services, customers, materials, transactions, calendar_events, audit_logs, service_types, material_categories, customer_origins) carries `org_id`
- **Lookup tables** (service_types, material_categories, customer_origins) are per-org — not global enums — with `UNIQUE(org_id, name)` constraints
- **RLS policies + helpers existem desde `0000`** e agora são **enforced também no
  caminho do backend** (defense-in-depth), não só para queries diretas do frontend.
- `SUPABASE_SECRET_KEY` in `.env` is the service role key — never committed, never exposed to frontend
- Supabase Auth handles JWT; `auth_id` in the `users` table is the FK to `auth.users`

## Ativação no backend (migration `0003` + `RlsContext`) — 2026-06-14

Defense-in-depth real: o backend deixou de rodar tudo como superuser (BYPASSRLS).

- **`0003_rls_policies.sql`** cria a role **`app_user`** (`LOGIN`, **`NOBYPASSRLS`**) e
  fecha a lacuna de RLS em `stock_movements` (tinha `org_id` mas ficou sem policy na 0000).
- **Duas conexões** (`apps/backend/src/database/database.module.ts`):
  - `DRIZZLE` → pool **`app_user`** (`DATABASE_APP_URL`). RLS-enforced. **Default dos repos.**
  - `DRIZZLE_ADMIN` → pool **`postgres`** (`DATABASE_URL`, BYPASSRLS). Migrations + bootstrap + guards.
- **Contexto por request**: `RlsContext.runWithClaims(authId, fn)` abre uma transação
  no pool `app_user`, faz `set_config('request.jwt.claims', '{"sub":authId,...}', true)`
  e roda o handler dentro de um `AsyncLocalStorage`; o provider `DRIZZLE` é um Proxy que
  resolve para essa conexão claims-bound. Acionado pelo **`RlsInterceptor`** global
  (`common/interceptors/rls.interceptor.ts`) quando há `request.user`.
- **Exceções que usam `DRIZZLE_ADMIN`** (RLS não se aplica):
  - `OrgMembershipGuard` — guards rodam **antes** do interceptor (sem claims ainda);
    já filtra por `user.id` então o isolamento é mantido.
  - `DrizzleUserRepository.create` — sign-up é **não autenticado** (sem claims).
  - `DrizzleOrgRepository.create` — insere o **primeiro owner membership**, que a policy
    `org_memberships_insert` (`is_org_owner`) bloquearia (chicken-and-egg).
- **Verificado** (API ao vivo + SQL direto como `app_user`): leitura/escrita só da própria
  org; `request.jwt.claims` estrangeiro/ausente ⇒ **0 linhas**; cross-org ⇒ 403; sign-up e
  create-org funcionam pelo caminho admin. Ver `[[domain-rules]]` e ADR-0006.
