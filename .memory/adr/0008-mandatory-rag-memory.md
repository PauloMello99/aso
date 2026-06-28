# ADR-0008 — RAG/memória obrigatória com servidor MCP `ink-memory`

**Status:** Aceito
**Data:** 2026-06-13
**Supersede parcialmente:** ADR-0002 (troca o `mcp-server-qdrant` genérico)

## Contexto

A camada de RAG do ADR-0002 existia, mas o uso era **opcional e parcial**:
- O `CLAUDE.md` dizia que o Claude "pode" buscar — não obrigatório.
- A única automação era reindexar ao escrever em `.memory/` (hook PostToolUse). Sem
  reindex no início da sessão, o índice podia estar vazio/desatualizado e a busca
  retornava nada silenciosamente.
- Usava o `mcp-server-qdrant` genérico (`qdrant_find`), sem visibilidade de saúde do índice.

Objetivo: tornar **recall + indexação obrigatórios em todo chat** e capturar conhecimento
durável quando o chat produzir algo relevante. Referência de implementação (apenas como
template, sem fundir projetos): `Upstart13/asd/asd-pipeline`.

## Decisão

1. **Servidor MCP próprio `ink-memory`** (`bin/scripts/rag/mcp_server.py`, FastMCP) expondo
   `memory_search(query, k)` e `memory_status()` — registrado em `.mcp.json`. Substitui o
   `mcp-server-qdrant` genérico.
2. **Recall obrigatório**: política no `CLAUDE.md` — para perguntas "onde/como funciona X",
   chamar `memory_search` **antes** de ler o código.
3. **Indexação automática via hooks**: SessionStart (`docker compose up -d` + reindex em
   background), Stop (reindex em background), PostToolUse (reindex ao escrever em `.memory/`).
4. **Criação quando relevante**: registrar decisão/convenção/gotcha durável em `.memory/`
   (ou novo ADR) antes de encerrar; chats triviais isentos.
5. **venv dedicado** `~/ink-ops-rag-venv` (WSL) — evita o shim do pyenv do Windows; usado por
   hooks, servidor MCP e scripts.

## Consequências

- Índice fica fresco no início de cada sessão; busca semântica disponível desde a 1ª mensagem.
- `memory_status()` permite checar saúde do índice (nº de chunks) antes de confiar na busca.
- Escopo de indexação inclui `docs/**/*.md` além de `.memory/`, READMEs de packages e `CLAUDE.md`.
- Setup inicial via `/rag-setup` (Ollama `nomic-embed-text`, Qdrant Docker, venv).
- Tooling em `bin/scripts/rag/`, `docker-compose.rag.yml` e o venv permanecem locais/pessoais
  (gitignored); `.mcp.json` aponta para o caminho WSL desta máquina.
- `qdrant-client` ≥ 1.18 removeu `.search()` — usar `query_points(...).points`.
