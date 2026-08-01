# ASO

Plataforma de gestão para estúdios e negócios de serviço — agendamento, clientes, estoque
e caixa. Monorepo Turborepo (pnpm workspaces): `apps/backend` (NestJS 11, Clean
Architecture, Drizzle + Supabase) e `apps/frontend` (Next.js pages router, feature-based,
React 19 + Tailwind).

Para contexto de arquitetura, convenções e workflow de desenvolvimento, ver
[`.claude/CLAUDE.md`](.claude/CLAUDE.md) e `.memory/` (arquitetura, regras de domínio, ADRs).
Design system em [`docs/design/design-system.md`](docs/design/design-system.md).

## Apps e packages

- `apps/backend` — API NestJS (caixa, clientes, materiais/estoque, serviços, calendar,
  overview, notifications, auth, organizations, admin, audit, mail, subscriptions)
- `apps/frontend` — dashboard + site de marketing (Next.js pages router)
- `@repo/eslint-config` — configs ESLint por runtime
- `@repo/typescript-config` — tsconfigs por runtime
- `@repo/utils` — `cn()` para merge de classes Tailwind
- `@repo/types` — tipos Supabase compartilhados

## Comandos

```bash
pnpm dev           # dev de todos os apps
pnpm build         # build com cache Turborepo
pnpm lint          # lint (--max-warnings 0)
pnpm check-types   # type-check
pnpm format        # prettier em todo o repo

pnpm --filter backend db:generate   # drizzle-kit generate (migration)
pnpm --filter backend db:migrate    # aplica migrations
pnpm --filter backend db:rollback   # reverte última migration
```

Supabase local: `pnpm db:start`; tipos: `pnpm db:gen-types`.

**Sempre pnpm** — nunca npm/yarn.
