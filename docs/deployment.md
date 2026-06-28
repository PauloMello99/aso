# Deploy — staging e production (Railway)

Guia operacional. Topologia e racional em
[`.memory/adr/0011-deploy-topology-e-caching.md`](../.memory/adr/0011-deploy-topology-e-caching.md).

```
development ──PR──▶ staging ──PR──▶ main
                   │                │
                   ▼                ▼
           Railway env: staging   Railway env: production
           + Supabase staging     + Supabase prod
        Frontend: Vercel          Frontend: Vercel
```

- **Backend**: Railway, **builder Dockerfile** (`apps/backend/Dockerfile`), com **dois Environments**
  (`staging` ← branch `staging`, `production` ← branch `main`). Migrações rodam no **boot** do
  container (entrypoint, `RUN_MIGRATIONS=true`).
- **Frontend**: Vercel (Next.js), um projeto com staging/prod por branch. (Pode ir pro Railway
  também, se quiser tudo num lugar — não é o default deste guia.)
- **Auth/DB/Storage**: Supabase gerenciado, **2 projetos** (staging e production).
- CI (`.github/workflows/ci.yml`) roda lint + type-check + build em todo PR. Deploy é por push na
  branch do ambiente (integração Git do Railway/Vercel).

## Serviços a provisionar

| Serviço | Para quê | Custo |
|---|---|---|
| Railway | backend NestJS (staging + production) | uso (pago) |
| Supabase (2 projetos) | Auth + Postgres + Storage | grátis → Pro |
| Vercel (Hobby) | frontend | grátis |
| Resend | e-mail transacional (opcional; domínio só p/ prod) | grátis (3k/mês) |
| GitHub Actions | CI + cron agendado | grátis |

Sem Redis.

## Configurações do backend no Railway (por Environment)

| Seção | Valor |
|---|---|
| **Build → Builder** | **Dockerfile** (`apps/backend/Dockerfile`). Limpe os *Custom Build/Start Command* — o `ENTRYPOINT` do Dockerfile cuida do start. |
| **Root Directory** | **raiz do repo** (não `apps/backend`) — o Dockerfile faz `turbo prune` do monorepo inteiro. |
| **Config-as-code** | aponte para `railway.json` (já traz builder Dockerfile, healthcheck e restart) ou sete os equivalentes no dashboard. |
| **Deploy → Healthcheck Path** | `/health` |
| **Deploy → Teardown** | ligado (derruba o deploy antigo quando o novo fica healthy) |
| **Watch Paths** | `/apps/backend/**`, `/packages/**`, `pnpm-lock.yaml`, `package.json`, `turbo.json` |
| **PORT** | injetado pelo Railway; o app lê `process.env.PORT`. **Não** crie var `PORT`. |
| **Restart Policy** | On Failure (ok) |

## Variáveis de ambiente (Railway, por Environment)

`NODE_ENV=production`, `RUN_MIGRATIONS=true`, `DATABASE_URL`, `DATABASE_APP_URL`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`, `CRON_SECRET`. E-mail (opcional):
`NOTIFICATIONS_EMAIL_ENABLED`, `RESEND_API_KEY`, `NOTIFICATIONS_FROM_EMAIL`.

> `DATABASE_URL` = role `postgres` (migrações/admin, BYPASSRLS) — use a **Session pooler** do
> Supabase (IPv4, porta 5432) para o container alcançar o banco.
> `DATABASE_APP_URL` = role `app_user` (runtime, NOBYPASSRLS; criado pela migration 0003).
> Cada Environment usa o Supabase do seu ambiente (staging/prod).

**Frontend (Vercel):** `NEXT_PUBLIC_API_URL` = URL pública do backend Railway do ambiente.

## Migrações (no boot — sem passo manual no Supabase)

Com `RUN_MIGRATIONS=true`, o `entrypoint.sh` roda `node dist/database/migrator.js up` antes de subir
o servidor. O `up` aplica **só os tags forward** de `apps/backend/drizzle/migrations/meta/_journal.json`;
os `*.down.sql` **nunca** rodam no `up` (só servem ao `db:rollback`). Logo, **não há risco de aplicar
os downs** e **não é preciso configurar nada dentro do Supabase** além das connection strings.

> Replica única (`numReplicas: 1`) → sem corrida de migração no boot. Mantenha migrações
> backward-compatible (expand-contract) para deploys seguros.

## Passo a passo (staging)

1. **Supabase**: criar projeto `ink-studio-staging`. Copiar URL + anon + service_role e as duas
   connection strings (Session pooler).
2. **Railway → Environment `staging`**: builder Dockerfile, healthcheck `/health`, setar as vars
   (incl. `RUN_MIGRATIONS=true`, `CRON_SECRET`), atrelar à branch `staging`. O push em `staging`
   builda, migra no boot e sobe.
3. **Vercel**: importar o repo; Root Directory = `apps/frontend`; `NEXT_PUBLIC_API_URL` = URL do
   backend (Railway staging); conectar à branch `staging`.
4. **GitHub Secrets** (cron): `BACKEND_URL_STAGING` (URL do Railway) e `CRON_SECRET_STAGING`
   (= `CRON_SECRET` do Railway).
5. **Smoke test**: abrir o frontend, sign-in, `/overview`, criar uma transação. Disparar o cron:
   Actions → "Scheduled crons" → Run workflow, conferir `{ sent }` / `{ orgsNotified }`.

## Production (diferenças)

- **Railway → Environment `production`** atrelado à branch `main`, com o Supabase **pago** e as
  mesmas vars (`RUN_MIGRATIONS=true`).
- Frontend Vercel apontando para `main` + `NEXT_PUBLIC_API_URL` = URL do Railway production.
- Resend com **domínio verificado** (DNS) para enviar de `no-reply@seudominio`.
- Secrets do cron: `BACKEND_URL_PROD`, `CRON_SECRET_PROD`.

## Build local da imagem (debug)

```bash
docker build -f apps/backend/Dockerfile -t ink-ops-backend .
# sobe até falhar na config DATABASE_URL (sem DB) — valida que a imagem carrega:
docker run --rm ink-ops-backend
```
