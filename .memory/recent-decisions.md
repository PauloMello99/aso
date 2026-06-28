# Decisões Recentes

Índice rápido — ver `.memory/adr/` para detalhe completo.

| # | Decisão | Data | Status |
|---|---|---|---|
| ADR-0001 | Turborepo como estrutura de monorepo | 2026-06-06 | Aceito |
| ADR-0002 | RAG local com Qdrant + Ollama + MCP Server | 2026-06-06 | Aceito |
| ADR-0003 | Drizzle ORM com migrator customizado (suporte a rollback) | 2026-06-06 | Aceito |
| ADR-0004 | Arquitetura NestJS com use-cases por operação | 2026-06-06 | Aceito |
| ADR-0005 | Multi-tenancy: DB único + org_id + RLS | 2026-06-06 | Aceito |
| ADR-0006 | Clean Architecture + SOLID no backend NestJS | 2026-06-08 | Aceito |
| ADR-0007 | Feature-Based Architecture no frontend Next.js | 2026-06-08 | Aceito |
| ADR-0008 | RAG/memória obrigatória com servidor MCP `ink-memory` | 2026-06-13 | Aceito |
| ADR-0009 | Feature Flags para liberação controlada de recursos | 2026-06-13 | Aceito |
| ADR-0010 | Caixa: livro append-only com erratas + saldo por agregação | 2026-06-16 | Aceito |
| ADR-0011 | Topologia de deploy (staging/prod) + caching in-memory sem Redis | 2026-06-27 | Aceito |

## Decisões/registros recentes (sem ADR)

- **2026-06-22 — Roadmap & situação consolidados**: `roadmap.md` é a fonte de follow-up
  com stakeholders (módulos prontos + backlog tarefa a tarefa, _Planejar_ vs _Backlog_).
  Espelhado no Notion. Documentação de produto anterior estava defasada.
- **2026-06-22 — TDD obrigatório por module**: regra em `domain-rules.md` (test-first;
  unitário + integração por module). Adoção plena é um "ataque de testes" no backlog (TEST-2).
- **2026-06-22 — Visibilidade por funcionário** concluída em Serviços/Agenda/Caixa
  (owner vê tudo + lança em nome de). Ver `domain-rules.md` e
  `docs/testing/employee-visibility-tests.md`.
