# ink-ops — Referência para Claude Code

## O que é

**ink-ops** — plataforma de gestão operacional multi-organização (organizations como
tenant, RLS por organização). Monorepo Turborepo: `apps/backend` (NestJS 11, Clean
Architecture) e `apps/frontend` (Next.js pages router, feature-based) são as aplicações
concretas; `packages/` tem as libs reutilizáveis. Domínio coberto pelos módulos de
backend: caixa (`cashier`), clientes (`customers`), materiais/estoque (`materials`),
serviços (`services`), `calendar`, `overview`, `notifications`, `support` (canal de
suporte B2B, ADR-0021), além de `auth`, `organizations`, `admin`, `audit`, `mail`,
`internal-cron`, `health`, `user`.

Arquitetura e decisões: `.memory/architecture.md`, `.memory/domain-rules.md` e os ADRs
em `.memory/adr/` (fonte de verdade). Roadmap: `.memory/roadmap.md`.

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | Turborepo 2 + pnpm 9 workspaces |
| Linguagem | TypeScript 5 strict |
| Backend | NestJS 11 + Drizzle ORM (migrator custom) + Supabase (auth/RLS) |
| Frontend | Next.js (pages router) + React 19 + Radix UI + Tailwind CSS |
| Estado servidor | TanStack React Query (keys em `infrastructure/query/query-keys.ts`) |
| E-mail | Resend + React Email (módulo `mail`, ADR-0012) |
| Telemetria | Better Stack (front + back, ADR-0014) |
| Utilitários | clsx + tailwind-merge (`cn()` em `@repo/utils`) |
| Linting | ESLint 9 + Prettier |
| Tipos DB | Supabase CLI → `db:gen-types` (`apps/backend/src/database/types_db.ts`) |

## Packages disponíveis

- `@repo/eslint-config` — configs ESLint por runtime (next, react-internal, node, base)
- `@repo/typescript-config` — tsconfigs por runtime (nextjs, nestjs, react-library, base)
- `@repo/utils` — `cn()` para merge seguro de classes Tailwind
- `@repo/types` — tipos Supabase compartilhados (popular via `supabase gen types`)

Não há `@repo/ui`: componentes shadcn/ui vivem direto em
`apps/frontend/src/shared/components/ui/`, sem package compartilhado.

## Comandos

```bash
pnpm dev           # dev de todos os packages/apps
pnpm build         # build com cache Turborepo
pnpm lint          # lint com cache (--max-warnings 0)
pnpm check-types   # type-check com cache
pnpm format        # prettier em todo o repo

pnpm --filter backend db:generate   # drizzle-kit generate (migration)
pnpm --filter backend db:migrate    # aplica migrations (migrator custom, ADR-0003)
pnpm --filter backend db:rollback   # reverte última migration (usa .down.sql)
pnpm --filter backend db:status     # estado das migrations
```

Supabase local: `pnpm db:start` (`npx supabase start`); tipos: `pnpm db:gen-types`.

## Convenções críticas

- **NUNCA npm/yarn** — sempre pnpm
- Instalar dep em package específico: `pnpm add <pkg> --filter @repo/<nome>`
- Instalar dev dep na raiz: `pnpm add -Dw <pkg>`
- Merging de classes Tailwind: sempre `cn()`, nunca template string
- Novas Turborepo tasks devem ser declaradas em `turbo.json`
- Dinheiro: **centavos inteiros** (`_cents`) em todo o stack; caixa é **append-only** com
  erratas + saldo agregado (ADR-0010) — nunca UPDATE/DELETE de lançamento
- Backend: um use-case por operação; use-cases nunca importam DRIZZLE direto; erros de
  negócio = `DomainException` + código em `DomainExceptionFilter.CODE_TO_STATUS`
  (regras completas em `.memory/domain-rules.md`)
- Multi-tenancy: single DB + RLS por organização (ADR-0005); `organization_id` derivado da
  sessão, nunca do cliente; `DRIZZLE_ADMIN` só em bootstrap/cron/guards/cross-org, e em
  escritas privilegiadas escopadas quando múltiplas classes de ator escrevem a mesma
  tabela (exceção deliberada, ver ADR-0021); `super_admin` age como owner (ADR-0013)
- Frontend: mobile-first; regras de UI obrigatórias em `.memory/domain-rules.md`
- Há suíte automatizada em ambas as apps: backend usa Jest (`apps/backend`, `ts-jest`,
  jest 30; `.spec.ts` por use-case, `jest.Mocked<Interface>` + builders `buildFake*`);
  frontend usa Vitest (`.spec.ts` junto de lib/schemas). `pnpm test` (turbo) roda as duas —
  validar mudanças com `pnpm check-types` + `pnpm lint` + `pnpm test` + `pnpm build`, e
  **verificar no preview toda mudança observável no navegador** (dev server via
  `.claude/launch.json`; ver `docs/ai/agentic-workflow.md` §Validação, passo 8)

## Workflow de agentes

O processo de desenvolvimento está formalizado em `docs/ai/agentic-workflow.md`
(roteamento adaptativo simples/intermediária/complexa, critérios de elevação por risco,
validação com os scripts reais) e `docs/ai/development-style-profile.md` (regras de
estilo — MUST/SHOULD/MAY/MUST NOT). Executado pela skill `development-workflow` com os
subagentes de `.claude/agents/` (`coordinator`, `locator`, `planner`, `backend-implementer`,
`frontend-implementer`, `debugger`, `tester`, `reviewer`, `database-guardian`, `design`,
`codebase-documenter`):

- **Menor fluxo suficiente**: mudança localizada ⇒ implementer (backend/frontend) +
  check-types/lint; poucos módulos ⇒ locator → implementer → tester; transversal/risco ⇒
  planner antes e reviewer depois. Bug de causa não óbvia ⇒ `debugger` antes do implementer;
  tela/fluxo novo ⇒ `design` antes do `frontend-implementer`.
- **Escrita de código**: só `backend-implementer` e `frontend-implementer`; o
  `codebase-documenter` escreve apenas docs; os demais são read-only.
- **Elevação por risco**: banco, RLS/tenancy, auth, caixa/dinheiro, cron, contratos
  públicos ou integrações externas ⇒ tratar como complexa mesmo se pequena.
- **Proibido**: push, deploy, migrations remotas, reset/clean destrutivos, commits sem
  solicitação.

## Memória semântica (RAG) — OBRIGATÓRIO

> **Recall primeiro (faça isto antes de ler código).** Para qualquer pergunta
> "onde/como funciona X", chame a MCP tool `memory_search("sua pergunta")` do servidor
> **`ink-memory`** **antes** de varrer/ler o código-fonte — ela busca semanticamente o
> banco de memória (`.memory/`, `docs/`, READMEs dos packages, `CLAUDE.md`) e devolve os
> trechos relevantes. Só leia o código quando os trechos recuperados forem insuficientes.
> Use `memory_status()` para confirmar que o índice está populado.

**Criação (obrigatória quando relevante).** Quando um chat estabelecer algo durável —
uma decisão, convenção ou *gotcha* — registre-o no arquivo `.memory/` certo (ou um novo
ADR) **antes de encerrar**. Chats triviais estão isentos; o objetivo é capturar
conhecimento que vale recall depois, não transcrever tudo.

**Indexação (automática).** O índice é re-atualizado em background no início de cada
sessão (hook SessionStart), ao fim de cada turno (hook Stop) e imediatamente após
qualquer escrita em `.memory/` (hook PostToolUse). Stack: Qdrant (Docker, `:6333`,
container **compartilhado** com outros projetos — cada um com sua coleção; ink-ops =
`ink_ops_memory`) + Ollama (`:11434`, `bge-m3`, híbrido dense+BM25 com parent-document
retrieval — ver ADR-0015). Setup inicial: `/rag-setup`.

Comandos manuais (raramente necessários — os hooks cuidam disso):
```powershell
docker compose -f docker-compose.rag.yml up -d          # subir Qdrant (compartilhado)
wsl ~/ink-ops-rag-venv/bin/python bin/scripts/rag/index.py --no-recreate   # reindex
```
Ou os slash commands `/memory-index` e `/memory-search`.

### Estrutura de `.memory/`

| Arquivo | Quando atualizar |
|---|---|
| `project-overview.md` | Mudança de escopo ou propósito |
| `architecture.md` | Nova app adicionada, decisão estrutural |
| `domain-rules.md` | Nova convenção de código estabelecida |
| `recent-decisions.md` | Após criar novo ADR |
| `adr/NNNN-*.md` | Para cada decisão arquitetural relevante |
| `sessions/YYYY-MM-DD-*.md` | Resumo de sessão complexa |

ADRs em `.memory/adr/` são **versionados em git**. Notes de sessão não são.
