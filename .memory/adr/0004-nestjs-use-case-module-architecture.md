---
name: adr-0004-nestjs-use-case-architecture
description: NestJS module structure using use-cases pattern instead of service layer
metadata:
  type: project
---

# ADR-0004: NestJS Module Architecture — Use-Case Pattern

**Date:** 2026-06-06
**Status:** Accepted

## Context

NestJS defaults to a Service layer between controllers and data sources. For ink-ops, the team wanted a more explicit domain operation boundary.

## Decision

Each feature module uses a **use-case-per-operation** structure instead of a generic service class:

```
src/modules/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts       # HTTP boundary; delegates to use-cases
└── use-cases/
    └── <verb>-<entity>.use-case.ts   # One class per operation
```

Controllers inject use-cases directly (not a service that aggregates them).
Use-cases are `@Injectable()` classes registered in the parent module's `providers` array.

## Rationale

- One use-case = one responsibility = easy to find, test, and replace
- Avoids "god service" classes that accumulate unrelated methods over time
- Matches the Drizzle injection model: use-cases inject `DRIZZLE` symbol and run queries directly

## Alternatives considered

- **Classic service layer** — Familiar but tends to grow into fat services; rejected for clarity
- **CQRS with @nestjs/cqrs** — Overhead for current team size; can migrate to it later if needed

## Consequences

- New features: create `use-cases/` folder, one file per operation, register all in module `providers`
- The `health` module is the canonical reference: `GetHealthUseCase` injected into `HealthController`
- `/new-module` slash command automates this scaffold
- Global modules: `ConfigModule` (NestJS config) and `DatabaseModule` (Drizzle) are `@Global()` — no need to import them in feature modules
