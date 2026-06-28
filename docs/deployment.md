# Deploy — staging e production (Railway)

Guia operacional. Topologia e racional em
[`.memory/adr/0011-deploy-topology-e-caching.md`](../.memory/adr/0011-deploy-topology-e-caching.md).

```
development ──PR──▶ staging ──PR──▶ main
                   │                │
                   ▼                ▼
        Railway env: staging     Railway env: production
        (backend + frontend)     (backend + frontend)
        + Supabase staging       + Supabase prod
```

- **Tudo no Railway.** Dois Environments (`staging` ← branch `staging`, `production` ← branch
  `main`), cada um com **dois serviços**: backend (`apps/backend/Dockerfile`) e frontend
  (`apps/frontend/Dockerfile`), ambos **builder Dockerfile**.
- **Backend**: migrações no **boot** (entrypoint, `RUN_MIGRATIONS=true`).
- **Frontend**: `next start`; `NEXT_PUBLIC_API_URL` é inlinado em **build time** (precisa estar
  setado como variável do serviço **antes** do build).
- **Auth/DB/Storage**: Supabase gerenciado, **2 projetos** (staging e production).
- CI (`.github/workflows/ci.yml`) roda lint + type-check + build em todo PR. Deploy é por push na
  branch do ambiente (integração Git do Railway).

## Serviços a provisionar

| Serviço | Para quê | Custo |
|---|---|---|
| Railway | backend NestJS + frontend Next (staging + production) | uso (pago) |
| Supabase (2 projetos) | Auth + Postgres + Storage | grátis → Pro |
| Resend | e-mail transacional (opcional; domínio só p/ prod) | grátis (3k/mês) |
| GitHub Actions | CI + cron agendado | grátis |

Sem Redis. Sem Vercel/Render.

## Configurações do backend no Railway (por Environment)

| Seção | Valor |
|---|---|
| **Build → Builder** | **Dockerfile** (`apps/backend/Dockerfile`). Limpe os *Custom Build/Start Command* — o `ENTRYPOINT` do Dockerfile cuida do start. |
| **Root Directory** | **raiz do repo** (não `apps/backend`) — o Dockerfile faz `turbo prune` do monorepo inteiro. |
| **Config-as-code** | aponte para `apps/backend/railway.json` (builder Dockerfile, healthcheck, restart) ou sete os equivalentes no dashboard. |
| **Deploy → Healthcheck Path** | `/health` |
| **Deploy → Teardown** | ligado (derruba o deploy antigo quando o novo fica healthy) |
| **Watch Paths** | `/apps/backend/**`, `/packages/**`, `pnpm-lock.yaml`, `package.json`, `turbo.json` |
| **PORT** | injetado pelo Railway; o app lê `process.env.PORT`. **Não** crie var `PORT`. |
| **Restart Policy** | On Failure (ok) |

## Configurações do frontend no Railway (serviço separado, por Environment)

| Seção | Valor |
|---|---|
| **Build → Builder** | **Dockerfile** (`apps/frontend/Dockerfile`). Limpe Custom Build/Start. |
| **Root Directory** | **raiz do repo** (turbo prune precisa do monorepo). |
| **Config-as-code** | `apps/frontend/railway.json`. |
| **Variável `NEXT_PUBLIC_API_URL`** | **crítico**: é inlinada em **build time**. Setar como variável do serviço **antes** do build = URL pública do backend Railway do ambiente. O Dockerfile a recebe via `ARG`. |
| **PORT** | injetado pelo Railway; `next start` respeita `process.env.PORT`. Não crie var `PORT`. |
| **Watch Paths** | `/apps/frontend/**`, `/packages/**`, `pnpm-lock.yaml`, `package.json`, `turbo.json` |

## Variáveis de ambiente (Railway, por Environment)

`NODE_ENV=production`, `RUN_MIGRATIONS=true`, `DATABASE_URL`, `DATABASE_APP_URL`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`, `CRON_SECRET`. E-mail (opcional):
`NOTIFICATIONS_EMAIL_ENABLED`, `RESEND_API_KEY`, `NOTIFICATIONS_FROM_EMAIL`.

> `DATABASE_URL` = role `postgres` (migrações/admin, BYPASSRLS) — use a **Session pooler** do
> Supabase (IPv4, porta 5432) para o container alcançar o banco.
> `DATABASE_APP_URL` = role `app_user` (runtime, NOBYPASSRLS; criado pela migration 0003).
> Cada Environment usa o Supabase do seu ambiente (staging/prod).

**Frontend (serviço Railway):** `NEXT_PUBLIC_API_URL` = URL pública do backend Railway do ambiente
(é build-time — ver tabela do frontend acima).

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
2. **Railway → Environment `staging`** (branch `staging`), com **dois serviços**:
   - **backend**: builder Dockerfile (`apps/backend/Dockerfile`), healthcheck `/health`, vars
     (incl. `RUN_MIGRATIONS=true`, `CRON_SECRET`). Builda, migra no boot e sobe.
   - **frontend**: builder Dockerfile (`apps/frontend/Dockerfile`), var `NEXT_PUBLIC_API_URL` =
     URL pública do backend (build-time).
3. **GitHub Secrets** (cron): `BACKEND_URL_STAGING` (URL do backend Railway) e `CRON_SECRET_STAGING`
   (= `CRON_SECRET` do Railway).
4. **Smoke test**: abrir o frontend, sign-in, `/overview`, criar uma transação. Disparar o cron:
   Actions → "Scheduled crons" → Run workflow, conferir `{ sent }` / `{ orgsNotified }`.

## Production (diferenças)

- **Railway → Environment `production`** (branch `main`), com o Supabase **pago** e as mesmas vars.
  O `NEXT_PUBLIC_API_URL` do frontend aponta pro backend Railway de produção.
- Resend com **domínio verificado** (DNS) para enviar de `no-reply@seudominio`.
- Secrets do cron: `BACKEND_URL_PROD`, `CRON_SECRET_PROD`.

## Build local das imagens (debug)

```bash
# backend — sobe até falhar na config DATABASE_URL (valida que a imagem carrega)
docker build -f apps/backend/Dockerfile -t ink-ops-backend .
docker run --rm ink-ops-backend

# frontend — NEXT_PUBLIC_API_URL é build-time
docker build -f apps/frontend/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 -t ink-ops-frontend .
docker run --rm -e PORT=3000 -p 3000:3000 ink-ops-frontend
```
