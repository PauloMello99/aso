# Deploy — resumo

Detalhe operacional em `docs/deployment.md`; decisão e racional em
`.memory/adr/0011-deploy-topology-e-caching.md`.

## Topologia
- Fluxo de branches: `development → staging → main`. CI (lint/types/build) em todo PR.
- **Staging** (grátis): Vercel (front) + **Render free** (back, Docker) + Supabase projeto free.
- **Production**: Vercel (front) + **Railway** (back, Docker) + Supabase projeto **pago**.
- **Supabase gerenciado nos dois ambientes** (não self-host) → staging ≡ prod em auth/RLS.
- Backend containerizado: `apps/backend/Dockerfile` (turbo prune multi-stage) +
  `entrypoint.sh` (roda migrações quando `RUN_MIGRATIONS=true`, depois sobe).
- Configs versionadas: `render.yaml`, `railway.json`, `apps/frontend/vercel.json`.

## Serviços externos
- **Supabase** (Auth+DB+Storage), **Resend** (e-mail, opcional/off por padrão), **GitHub Actions**
  (CI + cron — Render free não tem scheduler). **Sem Redis.**
- Cron: `.github/workflows/cron.yml` bate em `/internal/cron/{agenda-reminders,stock-check-reminders}`
  com header `x-cron-secret`; secrets `BACKEND_URL_*` / `CRON_SECRET_*` por ambiente.

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
