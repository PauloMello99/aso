# Memory-bank RAG (local, ink-ops)

Busca semântica **híbrida** (dense + BM25, fusão RRF) com **parent-document
retrieval** sobre `.memory/`, `docs/`, READMEs dos packages, `.claude/CLAUDE.md`
e — opt-in — o código TypeScript (`apps/backend/src`, `apps/frontend/src`,
`packages/{types,utils}/src`). Ver ADR-0015.

Stack: **Qdrant** (Docker, `localhost:6333`, named vectors `dense`+`sparse`,
**container compartilhado** com outros projetos — ver `docker-compose.rag.yml`) +
**Ollama** (`localhost:11434`) servindo **bge-m3** (1024d, multilingual, ctx 8k) +
**fastembed** (BM25 CPU). Coleção: `ink_ops_memory` (isolada por coleção; outros
projetos usam a mesma instância Qdrant com sua própria coleção).

A recall é **obrigatória**: para perguntas "onde/como funciona X", chame a MCP tool
`memory_search(...)` (servidor `ink-memory`) **antes** de ler o código. Código
indexado é **opt-in** na busca (`include_code=True` ou filtros
`app`/`module`/`layer`/`memory_type="code"`).

## Como funciona

- **Chunking token-aware** (`chunker.py`): headings → blocos atômicos (code fences
  e tabelas nunca são cortados) → chunks de ~400 tokens com overlap de 60
  (tokenizer XLM-RoBERTa do bge-m3, cache em `.rag/tokenizer/`).
- **Código** (`code_chunker.py`): split por símbolos top-level; payload
  `memory_type="code"` + `app`/`module`/`layer` derivados do path.
- **Parent-document** (`mcp_server.py`): cada chunk guarda offsets da seção
  H1/H2 dona; a busca devolve a **seção inteira lida do disco** (dedupe por
  seção; se o arquivo mudou desde a indexação, degrada para o snippet do chunk).
- **Hybrid**: prefetch dense (threshold `RAG_MIN_SCORE`=0.35) + sparse BM25,
  fusão RRF no Qdrant.
- **Incremental**: `chunk_hash` por chunk — só re-embeda o que mudou; órfãos
  são removidos.

## Setup (uma vez) — WSL

```bash
# 1. Modelo de embedding
ollama pull bge-m3

# 2. Qdrant em Docker (a partir da raiz do repo; container COMPARTILHADO — se outro
#    projeto já subiu, este comando é um no-op idempotente)
docker compose -f docker-compose.rag.yml up -d

# 3. venv dedicado + deps
REPO=/mnt/c/Repos/Pessoal/aso
python3 -m venv ~/ink-ops-rag-venv
~/ink-ops-rag-venv/bin/pip install -r "$REPO/bin/scripts/rag/requirements.txt"

# 4. Warm-up dos artefatos (tokenizer + BM25 — nunca dentro de hooks)
~/ink-ops-rag-venv/bin/python "$REPO/bin/scripts/rag/warmup.py"

# 5. Build inicial do índice
~/ink-ops-rag-venv/bin/python "$REPO/bin/scripts/rag/index.py"
```

Ou rode o slash command `/rag-setup` (documenta os passos acima).

> **Hygiene:** o venv de runtime é o do **WSL** (`~/ink-ops-rag-venv`), fora do
> repo. Não crie um `.venv` dentro de `bin/scripts/rag/` — além de gitignored, um
> venv Windows sem `fastembed`/`tokenizers` faria a busca cair em dense-only e a
> tokenização em `chars/3.3` silenciosamente. `reindex.sh` fixa o Python do WSL de
> propósito por isso.

## Uso

```bash
# Rebuild completo (recria a coleção; obrigatório ao trocar modelo/dim)
~/ink-ops-rag-venv/bin/python bin/scripts/rag/index.py

# Upsert incremental (o que os hooks rodam)
~/ink-ops-rag-venv/bin/python bin/scripts/rag/index.py --no-recreate

# Consulta manual (CLI) — docs
~/ink-ops-rag-venv/bin/python bin/scripts/rag/query.py "onde vivem os use-cases de materiais?"
# — código
~/ink-ops-rag-venv/bin/python bin/scripts/rag/query.py --code --app backend "guard de super_admin"
```

IDs de chunk são determinísticos — reindexar sobrescreve em vez de duplicar.

## Servidor MCP (`ink-memory`)

`mcp_server.py` expõe duas tools para a sessão Claude (config em `.claude/settings.json`):

| Tool | Função |
|---|---|
| `memory_search(query, k, memory_type, document, section, app, module, layer, include_code)` | Top-k seções-pai (hybrid + parent expansion) |
| `memory_status()` | Coleção + nº de chunks por memory_type |

## Automação (hooks)

Definidos em `.claude/settings.json`. O Qdrant é **um container compartilhado**
entre projetos (ver `docker-compose.rag.yml`); cada projeto usa sua coleção.

| Hook | Ação |
|---|---|
| SessionStart | sobe o Qdrant (`docker compose up -d`) + reindex incremental em background |
| Stop | reindex incremental em background no fim da sessão |
| PostToolUse (Write/Edit em `.memory/`) | reindex incremental imediato |

## Variáveis de ambiente (overrides)

| Var | Default |
|---|---|
| `RAG_QDRANT_URL` | `http://localhost:6333` |
| `RAG_OLLAMA_URL` | `http://localhost:11434` |
| `RAG_EMBED_MODEL` | `bge-m3` |
| `RAG_EMBED_DIM` | `1024` |
| `RAG_COLLECTION` | `ink_ops_memory` |
| `RAG_CHUNK_TOKENS` / `RAG_OVERLAP_TOKENS` | `400` / `60` |
| `RAG_MIN_CHUNK_TOKENS` | `80` (fragmentos menores são fundidos) |
| `RAG_PARENT_MAX_TOKENS` / `RAG_PARENT_MAX_CHARS` | `1600` / `2000` (cap da seção-pai no index / no query) |
| `RAG_MIN_SCORE` | `0.35` (threshold do prefetch dense) |

## Constantes internas (não-env, `mcp_server.py`)

| Constante | Valor | Papel |
|---|---|---|
| `k` (default de `memory_search`) | `5` | top-k retornado |
| `_PREFETCH` | `20` | candidatos por ramo (dense/sparse) antes da fusão RRF |
| limite de fusão | `max(k*3, k)` | folga para o dedupe por seção-pai antes de truncar em `k` |
| `PARENT_MAX_CHARS` | `2000` | corte do texto da seção-pai lido do disco no query |

## O que é indexado

`config.py → INDEX_GLOBS` (markdown) e `CODE_GLOBS` (TypeScript, com
`CODE_EXCLUDES` para specs/dist/tipos gerados).

## Dashboard Qdrant

http://localhost:6333/dashboard
