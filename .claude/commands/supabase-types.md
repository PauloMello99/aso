# /supabase-types

Regenerate TypeScript types from the local Supabase instance and update `@repo/types`.

## Usage

```
/supabase-types
```

## Prerequisites

Local Supabase must be running (`supabase start` from the repo root, or confirm port 54321 is up).

## Steps

1. Verify Supabase is running:
   ```powershell
   supabase status
   ```

2. Generate types (use Bash to avoid PowerShell capturing stderr into the file):
   ```bash
   supabase gen types typescript --local --schema public > packages/types/src/database.types.ts
   ```

3. Update `packages/types/src/index.ts` to re-export from the generated file:
   ```typescript
   export type { Database, Json } from "./database.types";
   // Re-export commonly used table row types for convenience:
   // export type { Tables, Enums } from "./database.types";
   ```

4. Run type-check to confirm no breakage:
   ```powershell
   pnpm check-types
   ```

5. Report which tables/enums changed in the generated output.

## Notes

- The generated file is large — do not commit it without reviewing the diff
- `@repo/types` is consumed by both frontend and backend; type breakage propagates
- If using Drizzle inferred types instead of Supabase generated types, use `typeof schema` from the schema barrel — these are two separate type sources and should not be mixed
