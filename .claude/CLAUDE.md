# ink-ops — Referência para Claude Code

## O que é

Monorepo Turborepo com pacotes compartilhados de tooling, UI e tipos. `apps/` está vazia — é onde as aplicações concretas vivem. `packages/` tem as libs reutilizáveis.

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | Turborepo 2 + pnpm 9 workspaces |
| Linguagem | TypeScript 5 strict |
| UI | React 19 + Radix UI + Tailwind CSS |
| Utilitários | clsx + tailwind-merge (`cn()` em `@repo/utils`) |
| Linting | ESLint 9 + Prettier |
| Tipos DB | Supabase CLI → `@repo/types` |

## Packages disponíveis

- `@repo/eslint-config` — configs ESLint por runtime (next, react-internal, node, base)
- `@repo/typescript-config` — tsconfigs por runtime (nextjs, nestjs, react-library, base)
- `@repo/ui` — componentes React (shadcn pattern); importar raw `.tsx`, sem build
- `@repo/utils` — `cn()` para merge seguro de classes Tailwind
- `@repo/types` — tipos Supabase compartilhados (popular via `supabase gen types`)

## Comandos

```bash
pnpm dev           # dev de todos os packages/apps
pnpm build         # build com cache Turborepo
pnpm lint          # lint com cache
pnpm check-types   # type-check com cache
pnpm format        # prettier em todo o repo
```

## Convenções críticas

- **NUNCA npm/yarn** — sempre pnpm
- Instalar dep em package específico: `pnpm add <pkg> --filter @repo/<nome>`
- Instalar dev dep na raiz: `pnpm add -Dw <pkg>`
- Merging de classes Tailwind: sempre `cn()`, nunca template string
- Novas Turborepo tasks devem ser declaradas em `turbo.json`

## Memória semântica (RAG)

O Claude pode buscar contexto automaticamente via `qdrant_find` (MCP tool) — requer Qdrant rodando:

```powershell
docker compose -f docker-compose.rag.yml up -d
```

Para reindexar após editar `.memory/`:
```powershell
python bin/scripts/rag/index.py --no-recreate
```

Ou usar o slash command `/memory-index`.

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
