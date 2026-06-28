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
qualquer escrita em `.memory/` (hook PostToolUse). Stack: Qdrant (Docker, `:6333`) +
Ollama (`:11434`, `nomic-embed-text`). Setup inicial: `/rag-setup`.

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
| `domain-rules.md` | Nova convenção de código estabelecida |
| `recent-decisions.md` | Após criar novo ADR |
| `adr/NNNN-*.md` | Para cada decisão arquitetural relevante |
| `sessions/YYYY-MM-DD-*.md` | Resumo de sessão complexa |

ADRs em `.memory/adr/` são **versionados em git**. Notes de sessão não são.