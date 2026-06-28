# Deploy — resumo

Detalhe operacional em `docs/deployment.md`; decisão e racional em
`.memory/adr/0011-deploy-topology-e-caching.md`.

## Topologia (Railway-only no backend — revisão 2026-06-28)
- Fluxo de branches: `development → staging → main`. CI (lint/types/build) em todo PR.
- **Backend**: **Railway** com 2 Environments (`staging` ← branch staging, `production` ← branch
  main), **builder Dockerfile**, root = raiz do repo, healthcheck `/health`. (Render foi descartado.)
- **Frontend**: Vercel (Next.js), staging/prod por branch.
- **Supabase gerenciado nos dois ambientes** (não self-host) → staging ≡ prod em auth/RLS.
- Migrações no **boot** do container (entrypoint, `RUN_MIGRATIONS=true`).
- Configs versionadas: `railway.json` (builder Dockerfile + healthcheck + restart),
  `apps/frontend/vercel.json`. `render.yaml` removido.

## Railway — settings do backend que importam
- Builder = **Dockerfile** (`apps/backend/Dockerfile`); limpar Custom Build/Start (o ENTRYPOINT
  cuida). Root Directory = **raiz do repo** (turbo prune). Healthcheck `/health`. PORT injetado
  (não criar var). Vars incl. `NODE_ENV=production`, `RUN_MIGRATIONS=true`, `CRON_SECRET`.
- `DATABASE_URL` = Supabase **Session pooler** (IPv4, 5432) — alcançável pelo container.

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
