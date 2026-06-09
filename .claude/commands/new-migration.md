# /new-migration

Generate a Drizzle migration (up + down SQL) after schema changes.

## Usage

```
/new-migration
```

No arguments needed — it reads from the current schema state.

## Steps to execute

1. Run `pnpm db:generate` from `apps/backend/` to generate the new `.sql` file in `drizzle/migrations/`
2. Identify the newly created migration file (highest numbered tag in `meta/_journal.json`)
3. Read the generated `.sql` file
4. Write a companion `<tag>.down.sql` file in the same folder that reverses every statement in the correct dependency order:
   - Drop FKs / constraints before tables (or use CASCADE)
   - Drop tables in reverse creation order
   - Drop enums after tables
   - DROP TYPE IF EXISTS / DROP TABLE IF EXISTS (safe)
5. Run `pnpm db:status` to confirm the migration shows as pending with a `.down.sql` present
6. Ask the user if they want to apply it now (`pnpm db:migrate`)

## Rules for .down.sql

- Always use `IF EXISTS` — never fail if already absent
- Use `CASCADE` on `DROP TABLE` to handle FK constraints automatically
- Drop enums after all tables that reference them
- Never reference the `drizzle.__drizzle_migrations` table — the migrator handles that

## Migration hash note

The migrator hashes the raw `.sql` file content (not split/joined). Do not modify the generated `.sql` file after generating — the hash will break.
