# ADR-0015 — Evolução do RAG: bge-m3 híbrido, parent-document e Qdrant compartilhado

**Status:** Aceito — implementado em 2026-07-15
**Data:** 2026-07-15
**Supersede parcialmente:** ADR-0002/ADR-0008 (mantém Qdrant + Ollama + MCP; troca modelo e retrieval)
**Base:** larmony ADR-0016 (mesma stack; ink-ops adota o pipeline e passa a dividir o container por coleção)

## Contexto

O RAG herdado (ADR-0002/0008) funciona — indexação incremental por hash, breadcrumbs,
filtros, MCP `ink-memory` — mas:

- **nomic-embed-text é EN-only** e toda a documentação/memória do ink-ops é pt-BR;
- chunking é **char-based** (1500 chars), cego a code fences e tabelas markdown;
- o retorno é o chunk isolado (~600 chars), sem o contexto da seção/documento pai;
- a busca é dense-only, sem sinal lexical (termos exatos como `super_admin` ou nomes de
  símbolos dependem de sorte semântica);
- o código-fonte (`apps/backend`, `apps/frontend`) não é indexado;
- cada projeto (ink-ops, larmony) subia **seu próprio container Qdrant** sobre bind mount
  por-repo, desperdiçando recurso e disputando a porta 6333.

O projeto larmony, na mesma pasta, já resolveu isso (ADR-0016). Adotamos o mesmo desenho.

## Decisão

Manter a stack local (Qdrant Docker + Ollama WSL-native + venv `~/ink-ops-rag-venv` +
FastMCP `ink-memory`) e evoluir:

1. **Embedding: `bge-m3`** (Ollama, 1024d, contexto 8k, multilingual forte em pt).
   Sem os prefixos `search_document:`/`search_query:` (eram específicos do nomic).
2. **Chunking token-aware**: tokenizer XLM-RoBERTa (pacote `tokenizers`, cache em
   `.rag/tokenizer/`, fallback ≈ chars/3.3). `CHUNK_TOKENS=400`, `OVERLAP_TOKENS=60`
   (~15%), merge de fragmentos <80 tokens. Code fences e tabelas markdown são **blocos
   atômicos** (nunca cortados no meio); chunks carregam offsets `char_start/char_end`.
3. **Parent-document retrieval sem duplicar storage**: o payload guarda
   `parent_source/parent_section/parent_start/parent_end` (seção H1/H2 dona, cap ~1600
   tokens); o `memory_search` lê o arquivo do disco e devolve a seção-pai deduplicada por
   `(parent_source, parent_section)`; se o arquivo divergiu do hash indexado, degrada para
   o snippet do filho.
4. **Hybrid search**: named vectors (`dense` cosine 1024 + `sparse` BM25 via `fastembed`
   `Qdrant/bm25` com `Modifier.IDF`); a query faz prefetch dense (threshold `RAG_MIN_SCORE`)
   + sparse e funde por **RRF** no servidor.
5. **Indexação de código TS**: globs adaptados à estrutura real do ink-ops —
   `apps/backend/src/**/*.ts`, `apps/frontend/src/**/*.{ts,tsx}`,
   `packages/{types,utils}/src/**/*.ts` (exclui spec/dist/.next/`database.types`/`.d.ts`;
   `packages/{eslint,typescript}-config` não têm `src/`). `code_chunker.py` divide por
   símbolos top-level via regex (sem tree-sitter); payload `memory_type="code"` +
   `app/module/layer` indexados. `memory_search` **exclui código por padrão** (docs são a
   fonte primária; código é opt-in via `include_code`/`--code`/filtro `app/module/layer`).
6. **Qdrant compartilhado (1 container / N coleções)**: `docker-compose.rag.yml` passou a
   definir **um único** container (`name: rag`, `container_name: rag-qdrant`, imagem pinada
   `qdrant/qdrant:v1.18.1`, healthcheck bash `/dev/tcp`) sobre **volume nomeado**
   `rag-storage` (Docker-managed, `rag_rag-storage`) — antes era `ink-rag-qdrant` sobre bind
   mount `./.rag/qdrant_storage`. ink-ops e larmony rodam o **mesmo** compose (idempotente
   pelo pin de imagem) e cada um usa sua coleção: ink-ops = `ink_ops_memory`, larmony =
   `larmony_memory`. O arquivo saiu do `.gitignore` (passou a ser **versionado**), pois
   `/rag-setup`, o README e o CLAUDE.md dependem dele.
7. **Hooks consolidados** em `.claude/settings.json`: SessionStart sobe o Qdrant + dispara
   **um** reindex canônico (`reindex.sh`, fire-and-forget); Stop reindexA; PostToolUse
   reindexa ao escrever em `.memory/`. Isso eliminou o double-reindex que existia entre
   `settings.json` e `settings.local.json`. Downloads de artefatos (fastembed/tokenizers)
   acontecem no `/rag-setup` via `warmup.py`, **nunca** em hook.

## Consequências

- A troca de dimensão (768→1024) + named vectors invalida a coleção antiga → exige
  **rebuild full** (`index.py` sem `--no-recreate`). O venv precisa ser atualizado
  (`fastembed`, `tokenizers`, `qdrant-client>=1.10`) antes do primeiro hook rodar.
- O container antigo `ink-rag-qdrant` e o bind mount `./.rag/qdrant_storage` ficam órfãos;
  removê-los é passo da migração (disputam a porta 6333 com `rag-qdrant`).
- Embedding ~2–3x mais lento que o nomic — irrelevante com o skip incremental por hash.
- O índice cresce com o código indexado; os filtros default mantêm o recall de docs limpo.
- As coleções `ink_ops_memory` (1024, híbrida) e `larmony_memory` convivem no mesmo Qdrant
  sem interferência (cada coleção tem sua própria config de vetores).

## Alternativas consideradas

- **Manter nomic-embed e só compartilhar o container** — mínimo, mas perde o ganho pt-BR /
  híbrido / parent / código que motivou a reconfiguração. Rejeitado.
- **Trocar o vector store** (pgvector/LanceDB) — reescreve mais, perde o dashboard e o
  sparse nativo do Qdrant. Rejeitado.
- **`paraphrase-multilingual`** (768d, ctx 512) — contexto curto demais para seção-pai.
- **`embeddinggemma`** — retrieval pt inferior ao bge-m3 nos benchmarks públicos.
- **Coleção separada para os pais** — leitura do disco é mais simples e sempre fresca.
