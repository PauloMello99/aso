# Deploy — resumo

Detalhe operacional em `docs/deployment.md`; decisão e racional em
`.memory/adr/0011-deploy-topology-e-caching.md`.

## Topologia (Railway-only — revisão 2026-06-28)
- Fluxo de branches: `development → staging → main`. CI (lint/types/build) em todo PR.
- **Tudo no Railway**: 2 Environments (`staging` ← branch staging, `production` ← branch main),
  cada um com **dois serviços** — backend (`apps/backend/Dockerfile`) e frontend
  (`apps/frontend/Dockerfile`), ambos builder **Dockerfile**, root = raiz do repo.
  (Render e Vercel descartados.)
- **Supabase gerenciado nos dois ambientes** (não self-host) → staging ≡ prod em auth/RLS.
- Backend: migrações no **boot** (entrypoint, `RUN_MIGRATIONS=true`).
- Frontend: `next start`; `NEXT_PUBLIC_API_URL` é **build-time** (inlinado no bundle) — setar como
  var do serviço antes do build; o Dockerfile recebe via `ARG`.
- Configs versionadas: `apps/backend/railway.json`, `apps/frontend/railway.json` (cada serviço
  aponta o Config-as-code pro seu). `render.yaml`, root `railway.json` e `vercel.json` removidos.

## Railway — settings que importam
- Builder = **Dockerfile** nos dois serviços; limpar Custom Build/Start. Root Directory = **raiz do
  repo** (turbo prune). Backend: healthcheck `/health`, vars `NODE_ENV=production`,
  `RUN_MIGRATIONS=true`, `CRON_SECRET`. PORT injetado (não criar var) — app e `next start` leem.
- `DATABASE_URL` = Supabase **Session pooler** (IPv4, 5432) — alcançável pelo container.
- Frontend image grande (~2GB, full prod deps + `next start`); follow-up: `output: 'standalone'`.

## Serviços externos
- **Supabase** (Auth+DB+Storage), **Resend** (e-mail, opcional/off por padrão), **GitHub Actions**
  (CI + cron). **Sem Redis.**
- Cron: `.github/workflows/cron.yml` bate em `/internal/cron/{agenda-reminders,stock-check-reminders}`
  com header `x-cron-secret`; secrets `BACKEND_URL_*` / `CRON_SECRET_*` por ambiente (URLs do Railway).

## Caching (sem Redis)
- `requestMemo` (database.module.ts, sobre o ALS do RLS): dedup de `findByAuthId` por request.
- `TtlCache` (Map+TTL, AppCacheModule global): `payment-fees` e `transaction-categories` por org
  (TTL 1h), invalidados no write do repo. **Membros ficou de fora** (invalidação frágil/risco de
  correção). Redis só ao escalar para multi-réplica.

## Gotchas de build (Windows → Docker)
- `.dockerignore` exclui `.venv`/`supabase`/`docs` etc.; um symlink `lib64` dangling do venv do RAG
  quebrava o sender do BuildKit (removido).
- `pnpm` no Docker: `pnpm dlx turbo prune` (evita bin global no PATH) + `ENV CI=true` (evita prompt
  de purge). `.gitattributes` força LF em `*.sh`/Dockerfile (senão CRLF quebra o entrypoint).
