---
name: adr-0003-drizzle-orm-custom-migrator
description: Decision to use Drizzle ORM with a custom migrator script that supports rollback
metadata:
  type: project
---

# ADR-0003: Drizzle ORM with Custom Migrator for Rollback Support

**Date:** 2026-06-06
**Status:** Accepted

## Context

NestJS needs an ORM for PostgreSQL. The project uses Supabase (PostgreSQL), is TypeScript-first, and needs schema-as-code with migration history tracking. Rollback capability is a hard requirement.

## Decision

Use **Drizzle ORM** (`drizzle-orm/node-postgres` + `pg` driver) with a **custom migration runner** (`src/database/migrator.ts`) instead of Drizzle's native `migrate()` for production use.

Drizzle's built-in `migrate()` is used internally for the `up` path, but the migrator also implements `down` and `status` commands that Drizzle does not provide natively.

## Alternatives considered

- **Prisma** — Too opinionated, generates its own client, poor Supabase RLS integration, heavyweight migrations
- **TypeORM** — Mature but decorator-heavy and poorly typed; known issues with complex joins
- **Drizzle native migrate only** — No rollback support; rejected because schema mistakes during development would require manual DB surgery

## Consequences

- **Schema-as-code** in `src/database/schema/` — single source of truth for types AND migrations
- **Every migration requires a companion `.down.sql`** file before it can be rolled back
- **Hash computation**: The migrator hashes the raw `.sql` file content (`sha256(rawContent)`) — this must match Drizzle's internal hash. Do NOT modify generated `.sql` files after creation.
- **Migration commands** (run from `apps/backend/`):
  - `pnpm db:generate` — drizzle-kit generate (creates `.sql`)
  - `pnpm db:migrate` — apply pending migrations
  - `pnpm db:rollback [n]` — roll back last n migrations (requires `.down.sql`)
  - `pnpm db:status` — show applied/pending state
- **Drizzle Studio** available via `pnpm db:studio` for visual schema inspection
- The `DRIZZLE` injection token (a Symbol) is the DI handle for the DB connection in NestJS modules

## Key implementation detail

The `computeMigrationHash` function must hash the raw SQL file content without modification. An early bug split on `"--> statement-breakpoint"` and rejoined — this produced a different hash than Drizzle stored. Fixed to: `createHash("sha256").update(rawSql).digest("hex")`.
