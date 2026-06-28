# Deploy — staging e production

Guia operacional do primeiro deploy. Topologia e racional em
[`.memory/adr/0011-deploy-topology-e-caching.md`](../.memory/adr/0011-deploy-topology-e-caching.md).

```
development ──PR──▶ staging ──PR──▶ main
                   │                │
                   ▼                ▼
        Vercel(front) + Render(back)   Vercel(front) + Railway(back)
        + Supabase free                + Supabase pago
```

CI (`.github/workflows/ci.yml`) roda lint + type-check + build em todo PR. O deploy é por push
na branch do ambiente (integração Git nativa de Render/Railway/Vercel).

## Serviços a provisionar

| Serviço | Para quê | Custo |
|---|---|---|
| Supabase (2 projetos) | Auth + Postgres + Storage (staging free, prod free→Pro) | grátis → ~US$25/mês |
| Render (web service free) | backend NestJS de **staging** | grátis (hiberna ocioso) |
| Railway | backend NestJS de **production** | ~US$5+/mês por uso |
| Vercel (Hobby) | frontend (staging e prod) | grátis |
| Resend | e-mail transacional (opcional; domínio só p/ prod) | grátis (3k/mês) |
| GitHub Actions | CI + cron agendado | grátis |

Sem Redis. **Ambiente de teste = US$ 0.**

## Variáveis de ambiente

**Backend** (ver `apps/backend/.env.example`): `DATABASE_URL`, `DATABASE_APP_URL`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`, `CRON_SECRET`,
`RUN_MIGRATIONS=true` (staging/prod), `PORT` (injetado pelo host). E-mail (opcional):
`NOTIFICATIONS_EMAIL_ENABLED`, `RESEND_API_KEY`, `NOTIFICATIONS_FROM_EMAIL`.

**Frontend** (`apps/frontend/.env.example`): `NEXT_PUBLIC_API_URL` = URL pública do backend do
ambiente.

> `DATABASE_URL` = role `postgres` (migrações/admin, BYPASSRLS).
> `DATABASE_APP_URL` = role `app_user` (runtime, NOBYPASSRLS). Pegue as duas no Supabase
> (Settings → Database; o `app_user` é criado pela migration 0003).

## Passo a passo (staging)

1. **Supabase**: criar projeto `ink-ops-staging`. Copiar URL + anon + service_role e as duas
   connection strings.
2. **Render**: New → Blueprint apontando para o repo (usa `render.yaml`). Ajustar `repo` e setar os
   secrets `sync: false`. Render builda `apps/backend/Dockerfile`, roda migrações (RUN_MIGRATIONS) e
   sobe na branch `staging`.
3. **Vercel**: importar o repo; Root Directory = `apps/frontend`; setar `NEXT_PUBLIC_API_URL` =
   URL do Render; conectar à branch `staging`.
4. **GitHub Secrets** (para o cron): `BACKEND_URL_STAGING` (URL do Render) e `CRON_SECRET_STAGING`
   (= `CRON_SECRET` setado no Render).
5. **Smoke test**: abrir o frontend, sign-in, abrir `/overview`, criar uma transação. Disparar o
   cron manualmente: Actions → "Scheduled crons" → Run workflow, e conferir `{ sent }` /
   `{ orgsNotified }`.

## Production (diferenças)

- Backend no **Railway** (usa `railway.json` + `apps/backend/Dockerfile`); setar as mesmas envs
  (com Supabase **pago**) e `RUN_MIGRATIONS=true`.
- Frontend no Vercel apontando para `main` + `NEXT_PUBLIC_API_URL` = URL do Railway.
- Resend com **domínio verificado** (DNS) para enviar de `no-reply@seudominio`.
- Secrets do cron: `BACKEND_URL_PROD`, `CRON_SECRET_PROD`.

## Build local da imagem (debug)

```bash
docker build -f apps/backend/Dockerfile -t ink-ops-backend .
# sobe até falhar na config DATABASE_URL (sem DB) — valida que a imagem carrega:
docker run --rm ink-ops-backend
```
