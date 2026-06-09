# ADR-0001 — Turborepo como estrutura de monorepo

**Status:** Aceito  
**Data:** 2026-06-06

## Contexto

O ink-ops precisa hospedar múltiplas aplicações (frontend, backend, libs) que compartilham configurações de tooling, tipos e componentes. Precisamos de uma estrutura que:
- Evite duplicação de configs ESLint/TypeScript entre projetos
- Cache builds para não recompilar o que não mudou
- Permita rodar `dev` de todas as apps com um único comando
- Seja compatível com pnpm workspaces

## Alternativas consideradas

1. **Nx** — poderoso, mas mais opinativo e complexo para projetos menores
2. **Lerna** — legado, sem cache nativo moderno
3. **Turborepo** — leve, focado em task pipeline e cache, integra nativamente com pnpm
4. **Repos separados** — sem overhead de monorepo, mas sem sharing de configs

## Decisão

Usar **Turborepo 2** com **pnpm workspaces** como estrutura do monorepo.

## Racional

- Turborepo faz uma coisa bem: pipeline de tasks com cache remoto opcional
- pnpm resolve workspaces com strict mode (sem hoisting acidental)
- Setup via `create-turbo` já estabelece os packages base necessários
- Cache local em `.turbo/` já acelera iterações; cache remoto (Vercel) pode ser ativado depois

## Consequências

- Todas as apps e packages devem declarar suas dependências em `package.json` (sem imports implícitos de hoisting)
- Novas tasks devem ser declaradas em `turbo.json` para aproveitar cache
- Deploy de apps individuais é independente — Turborepo não opina sobre isso
