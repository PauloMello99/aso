# ink-ops — Referência para Codex

## O que é

**ink-ops** — plataforma de gestão operacional multi-organização (organizations como
tenant, RLS por organização). Monorepo Turborepo: `apps/backend` (NestJS 11, Clean
Architecture), `apps/frontend` (Next.js pages router, feature-based), `packages/` com
libs compartilhadas. Domínio coberto pelos módulos de backend: caixa (`cashier`),
clientes (`customers`), materiais/estoque (`materials`), serviços (`services`),
`calendar`, `overview`, `notifications`, além de `auth`, `organizations`, `admin`,
`audit`, `mail`, `internal-cron`, `health`, `user`.

Arquitetura e decisões: `.memory/architecture.md`, `.memory/domain-rules.md` e os ADRs
em `.memory/adr/` (fonte de verdade). Roadmap: `.memory/roadmap.md`.

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | Turborepo 2 + pnpm workspaces |
| Linguagem | TypeScript 5 strict |
| Backend | NestJS 11 + Drizzle ORM (migrator custom) + Supabase (auth/RLS) |
| Frontend | Next.js (pages router) + React 19 + Radix UI + Tailwind CSS |
| Estado servidor | TanStack React Query (keys em `infrastructure/query/query-keys.ts`) |
| E-mail | Resend + React Email (módulo `mail`, ADR-0012) |
| Telemetria | Better Stack (front + back, ADR-0014) |
| Deploy | Railway (Frontend + Backend + Cron tick interno) |
| Tipos DB | Supabase CLI → `db:gen-types` (`apps/backend/src/database/types_db.ts`) |

## Packages disponíveis

- `@repo/eslint-config` — configs ESLint por runtime (next, react-internal, node, base)
- `@repo/typescript-config` — tsconfigs por runtime (nextjs, nestjs, react-library, base)
- `@repo/ui` — componentes React (shadcn pattern); no frontend os componentes de UI vivem
  em `apps/frontend/src/shared/components/ui/`
- `@repo/utils` — `cn()` para merge seguro de classes Tailwind
- `@repo/types` — tipos Supabase compartilhados

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
  erratas + saldo agregado (ADR-0010)
- Backend: um use-case por operação; use-cases nunca importam DRIZZLE direto; erros de
  negócio = `DomainException` + código em `DomainExceptionFilter.CODE_TO_STATUS`
  (regras completas em `.memory/domain-rules.md`)
- Multi-tenancy: single DB + RLS por organização (ADR-0005); `organization_id` derivado da
  sessão, nunca do cliente; `DRIZZLE_ADMIN` só em bootstrap/cron/guards; `super_admin` age
  como owner (ADR-0013)
- Frontend: mobile-first; regras de UI obrigatórias em `.memory/domain-rules.md`

## Workflow de agentes

O processo de desenvolvimento está formalizado em `docs/ai/agentic-workflow.md`
(roteamento adaptativo simples/intermediária/complexa, critérios de elevação por risco,
validação com os scripts reais) e `docs/ai/development-style-profile.md` (regras de
estilo — MUST/SHOULD/MAY/MUST NOT). Siga essas regras mesmo sem subagentes:

- **Menor fluxo suficiente**: mudança localizada ⇒ implementar + check-types/lint;
  poucos módulos ⇒ localizar → implementar → validar; transversal/risco ⇒ planejar
  antes e revisar depois.
- **Elevação por risco**: banco, RLS/tenancy, auth, caixa/dinheiro, cron, contratos
  públicos ou integrações externas ⇒ tratar como complexa mesmo se pequena.
- **Validação atual**: o repo ainda não tem suíte automatizada — validar por
  `pnpm check-types`, `pnpm lint`, `pnpm build`.
- **Proibido**: push, deploy, migrations remotas, reset/clean destrutivos, commits sem
  solicitação.

(No Claude Code, esse protocolo é executado pela skill `development-workflow` com os
subagentes de `.claude/agents/`.)

## Memória semântica (RAG) — OBRIGATÓRIO

> **Recall primeiro (faça isto antes de ler código).** Para qualquer pergunta
> "onde/como funciona X", chame a MCP tool `memory_search("sua pergunta")` do servidor
> **`ink-memory`** **antes** de varrer/ler o código-fonte — ela busca semanticamente
> o banco de memória (`.memory/`, `docs/`, READMEs dos packages, `AGENTS.md`) e devolve
> os trechos relevantes. Só leia o código quando os trechos recuperados forem
> insuficientes. Use `memory_status()` para confirmar que o índice está populado.

**Criação (obrigatória quando relevante).** Quando um chat estabelecer algo durável —
uma decisão, convenção ou *gotcha* — registre-o no arquivo `.memory/` certo (ou um novo
ADR) **antes de encerrar**. Chats triviais estão isentos.

**Indexação (automática).** O índice é re-atualizado em background no início da sessão
(hook SessionStart), ao fim de cada turno (hook Stop) e após qualquer escrita em
`.memory/` (hook PostToolUse). Stack: Qdrant (Docker, `:6333`) + Ollama (`:11434`,
`nomic-embed-text`), coleção `ink_ops_memory` — ver ADR-0002. Setup inicial: `/rag-setup`.

Comandos manuais (raramente necessários — os hooks cuidam disso):
```powershell
docker compose -f docker-compose.rag.yml up -d          # subir Qdrant
wsl ~/ink-ops-rag-venv/bin/python bin/scripts/rag/index.py --no-recreate   # reindex
```
Ou os slash commands `/memory-index` e `/memory-search`.

### Estrutura de `.memory/`

| Arquivo | Quando atualizar |
|---|---|
| `project-overview.md` | Mudança de escopo ou propósito |
| `architecture.md` | Nova app adicionada, decisão estrutural |
| `domain-rules.md` | Nova convenção de código ou regra de domínio |
| `roadmap.md` | Milestone concluído/replanejado |
| `recent-decisions.md` | Após criar novo ADR |
| `adr/NNNN-*.md` | Para cada decisão arquitetural relevante |
| `sessions/YYYY-MM-DD-*.md` | Resumo de sessão complexa |

ADRs em `.memory/adr/` são **versionados em git**. Notes de sessão não são.
