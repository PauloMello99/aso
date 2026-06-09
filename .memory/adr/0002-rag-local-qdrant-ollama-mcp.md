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
