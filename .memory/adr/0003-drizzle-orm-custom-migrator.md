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

## Addendum (2026-07-17): applied-state no longer keyed on hash

`status()`/`down()` originally decided "applied" by re-hashing the current `.sql`
file and checking if that hash exists anywhere in `drizzle.__drizzle_migrations`.
Reading drizzle-orm's actual `PgDialect.migrate()` (pg-core/dialect.ts) showed it
**never does this** — it gates purely on `created_at` (= journal `when`, aka
`folderMillis`) against the latest row, and only stores the hash as a side
column it never reads back. Since hand-written migrations (required since
drizzle-kit generate broke past 0011) routinely get tweaked after their first
local `db:migrate` test-run but before commit, their on-disk hash permanently
diverges from what was recorded at apply time — even though the DDL already
ran. This left `db:status`/`db:rollback` reporting migrations 0022–0025
as `[○ pending]` forever, and made `db:rollback` a silent, permanent no-op for
them, despite the schema already reflecting their DDL.

Fixed: `status()`/`down()` now match "applied" by `created_at = entry.when`
(mirroring drizzle's own bookkeeping key). `computeMigrationHash` is kept only
as a diagnostic — `status()` appends `(file changed since applied)` when the
current file's hash no longer matches the recorded one, but this no longer
gates the applied/pending determination. Practical effect: the "do NOT modify
generated `.sql` files after creation" rule above is now advisory, not
load-bearing — editing a migration after a local test-apply no longer breaks
status/rollback bookkeeping.
