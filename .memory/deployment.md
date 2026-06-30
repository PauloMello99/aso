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
  (só CI). **Sem Redis.**
- **Cron = serviço Railway dedicado** (imagem `alpine`, `*/15`, restart NEVER) que bate em
  `http://backend.railway.internal:3001/internal/cron/tick` via **private networking** (header
  `x-cron-secret` = `${{ Backend.CRON_SECRET }}`). O endpoint único despacha todos os jobs
  internamente (`InternalCronController` em `modules/internal-cron/`) com `Promise.allSettled`
  — isolamento de falha por job. Para novos jobs de cron: adicionar em `InternalCronController`
  apenas, sem alterar o Railway. Substituiu o `cron.yml` do GitHub Actions (aposentado).

## Caching (sem Redis)
- `requestMemo` (database.module.ts, sobre o ALS do RLS): dedup de `findByAuthId` por request.
- `TtlCache` (Map+TTL, AppCacheModule global): `payment-fees` e `transaction-categories` por org
  (TTL 1h), invalidados no write do repo. **Membros ficou de fora** (invalidação frágil/risco de
  correção). Redis só ao escalar para multi-réplica.

## Gotchas de runtime (Railway / Supabase)
- **`DATABASE_APP_URL` (role `app_user`)**: o app sobe e migra com `DATABASE_URL` (postgres), mas
  TODA request autenticada usa o pool de RLS (`app_user`) em `RlsContext.runWithClaims`. Se a string
  estiver errada → `password authentication failed for user "app_user"` (28P01) em todo request, com
  o boot/health OK (enganoso). A senha do `app_user` é `app_user_dev` (migration 0003 — trocar em
  prod!). Formato pooler Supabase: `postgresql://app_user.<project-ref>:<senha>@<host>.pooler.supabase.com:5432/postgres`
  (session pooler 5432; o `<project-ref>` vai no usuário, a senha no campo de senha).
- **Porta no Railway**: o app escuta `process.env.PORT`; o domínio público precisa apontar pra essa
  porta. Fixar `PORT=3001`/`3000` casa com o domínio. Mudança de var só aplica em **deploy real**
  (deploys disparados por var podem sair `SKIPPED` se houver "Wait for CI"/trigger só-no-push).
- **Private networking** exige bind IPv6 (`::`) — NestJS faz por padrão; se o cron der connection
  refused, usar `app.listen(port, '::')`.

## Gotchas de build (Windows → Docker)
- `.dockerignore` exclui `.venv`/`supabase`/`docs` etc.; um symlink `lib64` dangling do venv do RAG
  quebrava o sender do BuildKit (removido).
- `pnpm` no Docker: `pnpm dlx turbo prune` (evita bin global no PATH) + `ENV CI=true` (evita prompt
  de purge). `.gitattributes` força LF em `*.sh`/Dockerfile (senão CRLF quebra o entrypoint).
