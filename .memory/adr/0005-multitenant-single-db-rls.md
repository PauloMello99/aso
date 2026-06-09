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

Helper functions planned for RLS policies:
- `is_super_admin()` — checks `platform_role = 'super_admin'` for the current user
- `is_org_member(org_id)` — checks membership in `org_memberships`
- `is_org_owner(org_id)` — checks `org_role = 'owner'` in `org_memberships`

## Alternatives considered

- **Schema-per-tenant** — Each org gets its own PostgreSQL schema. Rejected: complex migration management, Drizzle doesn't support dynamic schemas cleanly.
- **Database-per-tenant** — Separate Supabase project per org. Rejected: cost, operational overhead, no shared analytics.
- **Application-level filtering only** — No RLS, just WHERE clauses in the backend. Rejected: single bypass bug exposes all data; Supabase Auth already integrates with RLS natively.

## Consequences

- **Every studio table** (services, customers, materials, transactions, calendar_events, audit_logs, service_types, material_categories, customer_origins) carries `org_id`
- **Lookup tables** (service_types, material_categories, customer_origins) are per-org — not global enums — with `UNIQUE(org_id, name)` constraints
- **RLS policies** are not yet written — this is a pending task. They must be added as a dedicated migration
- The NestJS backend uses the Supabase **service_role** key (bypasses RLS) for trusted server-side operations. Frontend never receives the service_role key.
- `SUPABASE_SECRET_KEY` in `.env` is the service role key — never committed, never exposed to frontend
- Supabase Auth handles JWT; `auth_id` in the `users` table is the FK to `auth.users`

## Pending

RLS policy migration (helper functions + per-table policies) — not yet written. This is a blocking dependency before the frontend can use Supabase client-side queries directly.
