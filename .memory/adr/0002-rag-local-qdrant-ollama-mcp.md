# ADR-0002 — RAG local com Qdrant + Ollama + MCP Server

**Status:** Aceito  
**Data:** 2026-06-06

## Contexto

Claude Code perde contexto entre sessões. Precisamos de uma camada de memória semântica que:
- Permita recuperação autônoma (sem intervenção manual do usuário)
- Rode localmente (sem custos de API para embeddings)
- Seja fácil de manter e atualizar
- Indexe docs de arquitetura, ADRs e convenções do projeto

## Alternativas consideradas

1. **Somente memória nativa do Claude Code** — persistente mas sem busca semântica; limitado a notas curtas
2. **asd-pipeline approach (Qdrant + Ollama + scripts)** — funciona, mas busca é manual (usuário roda `query.py`)
3. **Pinecone/cloud vectors** — custo recorrente, dependência de internet, dados saem da máquina
4. **mem0 managed** — custo, vendor lock-in
5. **Qdrant + Ollama + MCP Server** ← escolhido

## Decisão

Stack local: **Qdrant** (Docker) + **Ollama** (nativo Windows) + **mcp-server-qdrant** configurado no Claude Code.

## Racional

O **Qdrant MCP Server** é o diferencial: expõe `qdrant_find` como ferramenta nativa para o Claude — a busca semântica acontece autonomamente durante a conversa, sem que o usuário precise rodar scripts. O índice fica warm enquanto o Docker está rodando.

- `nomic-embed-text` via Ollama: 768-dim, cosine, qualidade boa para texto técnico, sem custo
- Chunking por heading markdown com breadcrumb: permite recuperar seções específicas
- IDs determinísticos (UUID5): re-indexação é idempotente

## Consequências

- Requer Docker Desktop + Ollama instalados (one-time setup)
- `docker compose -f docker-compose.rag.yml up -d` precisa estar rodando para buscas funcionarem
- Índice precisa ser reconstruído após edições em `.memory/` (hook automático configurado)
- ADRs versionados em git (`.memory/adr/`); notes de sessão gitignored (`.memory/sessions/`)

## Atualização (2026-06-21) — embedding enriquecido, metadata e indexação incremental

A pipeline em `bin/scripts/rag/` foi refatorada para melhorar qualidade de recall,
observabilidade e custo de reindex:

- **Embedding enriquecido** (`embedding_context.build_embedding_text`): o vetor passa a
  ser gerado de um bloco determinístico `Memory Type / Document / Section / Breadcrumb /
  Content`, não mais só do corpo. Isso desambigua seções homônimas entre documentos
  (ex.: "Consequências" de cada ADR).
- **Metadata estruturada** (`metadata.extract_doc_metadata`): cada chunk carrega
  `memory_type`, `document`, `section`, `title`, `category`, `tags`, `source`,
  `breadcrumb`, `text`, `chunk_hash`. Frontmatter YAML (antes descartado) é parseado sem
  PyYAML e o `description` vira um chunk recuperável.

  | campo | origem |
  |---|---|
  | `memory_type` | path: `.memory/adr/*`→`adr`; `.memory/<stem>.md`→stem; `docs/*`→`doc`; `packages/*/README.md`→`package-readme`; `CLAUDE.md`→`claude` |
  | `document` | ADRs→`ADR-NNNN`; package README→nome do pacote; senão stem |
  | `title` | frontmatter `name` → H1 → stem |
  | `category` | frontmatter `metadata.type` |
  | `section` | último segmento do breadcrumb |
  | `chunk_hash` | `sha256(embedding_text)` |

- **Filtros de retrieval**: `query.py --type/--document/--section` e a MCP tool
  `memory_search(query, k, memory_type, document, section)` filtram via payload indexes
  (keyword) em `memory_type/document/section/category`. `memory_status` reporta contagem
  por tipo.
- **Indexação incremental real** (`index.py --no-recreate`): pula chunks cujo `chunk_hash`
  não mudou e remove pontos órfãos (seções/arquivos removidos). Reindex em estado estável
  custa ~zero embeddings.
- **Diagnóstico** (`health.py`): relatório de distribuição de tamanho/tipo, duplicatas,
  órfãos e stats da coleção; `--validate` faz amostragem de vizinhos para validar
  clusterização semântica.

Migração: trocar o input de embedding invalida todos os vetores antigos → exige **um
rebuild completo** (`index.py`) na adoção; o esquema de IDs (UUID5) não muda.

Auditoria de chunks (rebuild de 2026-06-21): 42 documentos, 285 chunks; tamanho em chars
min=45 / mediana=488 / média=653 / max=5220; só 1 chunk <250 (doc de chunk único, não
mesclável); 12 chunks >1500 são parágrafos/tabelas/code-blocks sem linha em branco interna
(limite inerente do split por parágrafo). 0 duplicatas, 0 órfãos.
