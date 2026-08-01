# Arquitetura do ink-ops

## Estrutura de pastas

```
ink-ops/
├── apps/
│   ├── backend/              # NestJS API (@repo/eslint-config/node)
│   └── frontend/             # Next.js frontend (@repo/eslint-config/next)
├── packages/
│   ├── eslint-config/        # @repo/eslint-config
│   ├── typescript-config/    # @repo/typescript-config
│   ├── types/                # @repo/types (Supabase + shared types)
│   └── utils/                # @repo/utils (cn, etc.)
├── .memory/                  # Banco de memória do Claude Code
│   ├── adr/                  # ADRs (versionados em git)
│   └── sessions/             # Notas de sessão (gitignored)
├── bin/scripts/rag/          # Scripts de indexação RAG (versionados)
└── docker-compose.rag.yml    # Qdrant compartilhado com outros projetos (versionado, ADR-0015)
```

Não existe `packages/ui` — componentes shadcn/ui vivem direto em
`apps/frontend/src/shared/components/ui/`, sem package compartilhado.

## Turborepo task pipeline

| Task | Dependência | Cache | Saídas |
|---|---|---|---|
| `build` | `^build` | sim | `.next/**` |
| `lint` | `^lint` | sim | — |
| `check-types` | `^check-types` | sim | — |
| `dev` | nenhuma | não | — (persistente) |

## Convenções de pacotes

- Cada app/package tem `eslint.config.js` estendendo `@repo/eslint-config/<tipo>`
- Cada package tem `tsconfig.json` estendendo `@repo/typescript-config/<tipo>`
- Imports internos via workspace alias: `@repo/<nome>`

## Backend — estrutura NestJS

Padrão: **Clean Architecture** com use-case por operação (ver ADR-0004 + ADR-0006).

Cada módulo de feature tem quatro camadas explícitas:

```
src/modules/<feature>/
├── domain/                    # zero imports externos — entidades, interfaces, exceções
├── application/
│   ├── ports/                 # interfaces de serviços externos (IAuthProvider etc.)
│   └── use-cases/             # um arquivo por operação
├── infrastructure/
│   ├── persistence/           # DrizzleXxxRepository + XxxMapper
│   └── <feature>-infrastructure.module.ts  # binding Symbol → DrizzleImpl
└── <feature>.module.ts        # imports infra, providers use-cases, exports
```

Regra crítica: **use-cases injetam interfaces via Symbol token, nunca DRIZZLE direto**.

```
src/
├── main.ts                        # bootstrap + DomainExceptionFilter + HttpExceptionFilter
├── app.module.ts
├── common/
│   ├── exceptions/domain.exception.ts     # base abstract DomainException
│   └── filters/
│       ├── domain-exception.filter.ts     # code → HTTP status (DomainException subclasses)
│       └── http-exception.filter.ts       # NestJS HttpException
├── database/
│   ├── database.module.ts         # @Global(), exports DRIZZLE symbol
│   ├── migrator.ts
│   └── schema/                    # persistence models Drizzle (NÃO é domain layer)
│       ├── enums.ts, users.ts, organizations.ts, subscriptions.ts
│       └── studio/*.ts
└── modules/
    ├── user/                      # piloto Clean Architecture
    │   ├── domain/user.entity.ts, user.repository.interface.ts, exceptions/
    │   ├── application/use-cases/get-me.use-case.ts
    │   ├── infrastructure/persistence/{user.repository,user.mapper}.ts
    │   └── user.module.ts
    ├── auth/
    │   ├── application/ports/auth-provider.interface.ts   # IAuthProvider port
    │   ├── domain/exceptions/{invalid-credentials,auth-token-expired}.exception.ts
    │   ├── infrastructure/providers/supabase-auth.provider.ts
    │   ├── use-cases/             # sign-up, sign-in, sign-out, refresh, forgot, reset
    │   ├── guards/, decorators/, dto/
    │   └── auth.module.ts
    └── health/                    # módulo simples de referência
```

### Módulos globais NestJS

- `ConfigModule.forRoot({ isGlobal: true })` — env vars via `ConfigService`
- `DatabaseModule` — `@Global()`, injeta pool PostgreSQL + Drizzle via token `Symbol("DRIZZLE")`
- Feature modules não precisam importar nenhum dos dois
- `DRIZZLE` só é injetado diretamente em `DrizzleXxxRepository` (infrastructure), nunca em use-cases

### Migrations (ver ADR-0003)

| Comando | Ação |
|---|---|
| `pnpm db:generate` | drizzle-kit generate → cria `.sql` em `drizzle/migrations/` |
| `pnpm db:migrate` | aplica migrations pendentes |
| `pnpm db:rollback [n]` | reverte n migrations (requer `.down.sql` companheiro) |
| `pnpm db:status` | exibe estado aplicado/pendente |

**Regra crítica de hash**: o migrator faz `sha256(rawSqlContent)` — não modifique o `.sql` gerado após criação.

### Supabase local

- Porta PostgreSQL: `54322`, Studio: `54323`, API: `54321`
- `supabase start` / `supabase stop` na raiz do monorepo
- Credentials locais em `apps/backend/.env` (gitignored)

## Tipagem

- TypeScript strict mode em todos os packages
- `noUncheckedIndexedAccess` ativo
- `isolatedModules` ativo (compatível com esbuild/SWC)
- Supabase types em `@repo/types` (gerado via `/supabase-types` command)
- Drizzle inferred types via `typeof schema` — fonte separada dos Supabase types, não misturar
