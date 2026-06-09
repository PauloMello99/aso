# /new-module

Scaffold a new NestJS module following the ink-ops architecture pattern.

## Usage

```
/new-module <module-name>
```

Example: `/new-module appointments`

## What to generate

Create these files under `apps/backend/src/modules/<module-name>/`:

```
<module-name>/
├── <module-name>.module.ts
├── <module-name>.controller.ts        # only if the module exposes HTTP endpoints
└── use-cases/
    └── (at least one use-case stub)
```

## Pattern to follow

Look at `apps/backend/src/modules/health/` as the canonical reference:
- The module class imports its controller and use-cases
- Controllers inject use-cases (not services directly)
- Use-cases are classes decorated with `@Injectable()` that encapsulate one operation
- Each use-case filename follows `<verb>-<entity>.use-case.ts`

## After generating

1. Register the new module in `apps/backend/src/app.module.ts` imports array
2. If any new Drizzle tables are needed, remind the user to run `/new-migration` after updating the schema
