# ink-ops — Memory Index

- [Project Overview](project-overview.md) — O que é o ink-ops, visão geral, estado atual do monorepo e referência da v1
- [Architecture](architecture.md) — Estrutura de pastas, NestJS pattern, Drizzle migrations, Supabase local, Turborepo tasks
- [Domain Rules](domain-rules.md) — Multi-tenancy, roles, billing, tipos de serviço, relação serviço↔transação, pendências V1
- [Recent Decisions](recent-decisions.md) — Índice rápido de todos os ADRs
- [Supabase Coupling](supabase-coupling.md) — Mapa de acoplamento ao Supabase (auth/storage/RLS) e sign-up atômico — SEC-3

## ADRs

- [ADR-0001: Turborepo monorepo](adr/0001-turborepo-monorepo-starter.md) — pnpm workspaces + Turborepo 2 como estrutura base
- [ADR-0002: RAG local Qdrant + Ollama](adr/0002-rag-local-qdrant-ollama-mcp.md) — memória semântica do Claude Code via MCP
- [ADR-0003: Drizzle ORM + migrator customizado](adr/0003-drizzle-orm-custom-migrator.md) — rollback via .down.sql, hash computation rule
- [ADR-0004: NestJS use-case architecture](adr/0004-nestjs-use-case-module-architecture.md) — um use-case por operação, sem service layer
- [ADR-0005: Multi-tenancy single DB + RLS](adr/0005-multitenant-single-db-rls.md) — org_id em toda tabela de domínio, RLS pendente
