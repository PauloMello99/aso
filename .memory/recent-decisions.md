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
| ADR-0012 | E-mail transacional: React Email + módulo `mail` dedicado (auth fora do GoTrue) | 2026-06-28 | Aceito |
| ADR-0013 | super_admin age como owner de qualquer org (bypass no miss-path; banner; audit→PLAT-3) | 2026-06-29 | Aceito |
| ADR-0015 | RAG: bge-m3 híbrido (dense+BM25+RRF), parent-document, código TS, Qdrant compartilhado com larmony | 2026-07-15 | Aceito |
| ADR-0016 | Billing Stripe (M11): trial via Checkout com cartão, comp local, desconto via Coupon API, tier único `standard` paid-only, `ActiveSubscriptionGuard` por-controller | 2026-07-18 | Aceito |
| ADR-0017 | Rebrand ASO: identidade visual teal (paleta larmony), Inter, tokens semânticos success/warning/info, telas padronizadas | 2026-07-19 | Aceito |
| ADR-0018 | Conformidade legal Tier 1: divisão controlador (ASO)/operador (estúdio), sem banner de cookies, consentimento versionado e snapshotado (signup + anamnese), identificação do fornecedor no footer | 2026-07-27 | Aceito |
| ADR-0019 | Rebrand v2: paleta steel/azul-aço (supersede a cor do ADR-0017), domínio assessorink-so.com, SEO/assets de marca (public/, robots, sitemap, noindex), rename do repositório | 2026-08-01 | Aceito |

## Decisões/registros recentes (sem ADR)

- **2026-06-22 — Roadmap & situação consolidados**: `roadmap.md` é a fonte de follow-up
  com stakeholders (módulos prontos + backlog tarefa a tarefa, _Planejar_ vs _Backlog_).
  Espelhado no Notion. Documentação de produto anterior estava defasada.
- **2026-06-22 — TDD obrigatório por module**: regra em `domain-rules.md` (test-first;
  unitário + integração por module). Adoção plena é um "ataque de testes" no backlog (TEST-2).
- **2026-06-22 — Visibilidade por funcionário** concluída em Serviços/Agenda/Caixa
  (owner vê tudo + lança em nome de). Ver `domain-rules.md` e
  `docs/testing/employee-visibility-tests.md`.
- **2026-07-19 — Design system ASO formalizado** (adendo ao ADR-0017): referência completa
  em `docs/design/design-system.md` + checklist operacional em
  `.claude/skills/aso-design/SKILL.md`. Fonte canônica é o bundle de handoff de design;
  nada de novo foi decidido, apenas documentado (tokens, componentes, conteúdo, ícones).
  `SectionCard`/`KpiCard` seguem como padrões locais de `overview-page.tsx`, não extraídos
  para `shared/components/ui/` — ver adendo do ADR-0017.
