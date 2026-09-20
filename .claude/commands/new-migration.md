# /new-migration

Write a Drizzle migration by hand (up + down SQL) after schema changes.

## Usage

```
/new-migration
```

No arguments needed — it reads from the current schema state.

> **NEVER run `pnpm db:generate` (`drizzle-kit generate`).** It has been broken since
> migration `0011` (missing snapshot) and has not been used since `0003`. Every migration
> from `0003` onward is written **by hand**. Editing `apps/backend/src/database/schema/`
> neither generates nor alters a migration — the schema is a read-only mirror.

## Steps to execute

1. Find the highest numbered tag in `drizzle/migrations/meta/_journal.json` and pick the next
   number; read the most recent migration as the pattern to imitate.
2. Write `<NNNN>_<name>.sql` by hand in `apps/backend/drizzle/migrations/`, matching the DDL
   to the intended schema state. Backfills must be idempotent.
3. Write the companion `<NNNN>_<name>.down.sql` in the same folder, reversing every statement
   in the correct dependency order:
   - Drop FKs / constraints before tables (or use CASCADE)
   - Drop tables in reverse creation order
   - Drop enums after tables
   - DROP TYPE IF EXISTS / DROP TABLE IF EXISTS (safe)
4. **Add the entry manually to `meta/_journal.json`.** Without it, drizzle-orm's `migrate()`
   silently ignores the migration — `db:migrate` reports no error and simply does not apply it.
5. Run `pnpm --filter backend db:status` to confirm the migration shows as pending with a
   `.down.sql` present.
6. Ask the user if they want to apply it now (`pnpm --filter backend db:migrate`).

## Rules for .down.sql

- Always use `IF EXISTS` — never fail if already absent
- Use `CASCADE` on `DROP TABLE` to handle FK constraints automatically
- Drop enums after all tables that reference them
- Never reference the `drizzle.__drizzle_migrations` table — the migrator handles that

## Migration hash note

The migrator hashes the raw `.sql` file content (not split/joined). Do not modify a `.sql` file after it has been applied — the hash will break.
