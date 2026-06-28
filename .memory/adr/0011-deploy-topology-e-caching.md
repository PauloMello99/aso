# ADR-0011 — Topologia de deploy (staging/prod) e estratégia de caching

**Status:** Aceito
**Data:** 2026-06-27 (revisado 2026-06-28: backend Railway-only — Render descartado)
**Origem:** Sessão de preparação do primeiro deploy de ambiente de teste

## Contexto

O ink-ops estava pronto em features mas nunca havia ido ao ar. Precisávamos de um primeiro
deploy de teste, de uma topologia de dois ambientes com CI/CD por branch
(`development → staging → main`) e de uma decisão sobre **caching** (Redis ou não). Levantamento
dos serviços externos reais:

- **Supabase** — Auth (GoTrue) + Postgres + Storage. Atrás de ports (`IAuthProvider`,
  `IStorageProvider`). RLS depende de `auth.uid()` (schema `auth` do Supabase) e os buckets são
  provisionados via `storage.buckets` (migrations 0010/0012, só rodam no Supabase).
- **Resend** — e-mail transacional, **opcional e desligado por padrão**
  (`NOTIFICATIONS_EMAIL_ENABLED=false`).
- **Cron** — endpoints HTTP `POST /internal/cron/{agenda-reminders,stock-check-reminders}`
  guardados por header `x-cron-secret`. Sem Bull/queue/Redis.
- **Caching** — inexistente. `findByAuthId(orgId, authId)` era resolvido ~3x por carga do overview.

## Decisão

### Topologia (Supabase gerenciado nos dois ambientes)

> **Revisão 2026-06-28:** consolidado **só no Railway** (Render descartado). O backend roda em
> **dois Railway Environments** (`staging` ← branch staging, `production` ← branch main), ambos com
> **builder Dockerfile** e migração no boot. `render.yaml` foi removido.

| Camada | Staging (`staging`) | Production (`main`) |
|---|---|---|
| Frontend (Next) | Vercel Hobby | Vercel |
| Backend (NestJS) | Railway env `staging` (Docker) | Railway env `production` (Docker) |
| Auth/DB/Storage | Supabase projeto free | Supabase projeto pago |
| E-mail | Resend sandbox | Resend + domínio verificado |
| Cron | GitHub Actions (`cron.yml`) | GitHub Actions (`cron.yml`) |

- **Não self-hospedar Supabase agora.** É possível (subir GoTrue/Storage/Kong/Postgres no
  Railway), mas exige replicar `auth.uid()`, extrair o provisionamento de buckets do SQL e operar
  backups — esforço médio-alto sem ganho neste estágio. Manter o Supabase gerenciado garante
  **staging ≡ prod** em auth/RLS. Reavaliar se/quando custo ou controle justificarem.
- **Backend containerizado** com Dockerfile multi-stage (turbo prune). Migrações rodam no **boot**
  via `entrypoint.sh` quando `RUN_MIGRATIONS=true` (autoridade única; `numReplicas: 1` → sem corrida).
  O `up` aplica só os tags forward de `meta/_journal.json` — os `*.down.sql` nunca rodam no `up`.
- **Railway settings que importam**: builder Dockerfile, Root Directory = raiz do repo (turbo prune
  precisa do monorepo), healthcheck `/health`, PORT injetado (não criar var). `DATABASE_URL` via
  **Session pooler** do Supabase (IPv4, alcançável pelo container).
- **Cron centralizado no GitHub Actions** — de graça, cobre os dois ambientes via matrix
  (`BACKEND_URL_*`/`CRON_SECRET_*` = URLs do Railway), pulando o que não tiver secrets.

### Caching (in-memory por instância, sem Redis)

Ao scale atual (poucos estúdios, 1 réplica por ambiente) **Redis não se justifica**. Adotado:

1. **Memo por request** (`requestMemo` no `database.module.ts`, sobre o AsyncLocalStorage do RLS):
   dedup de lookups idênticos no mesmo request. Aplicado a `findByAuthId` — elimina ~2-3 queries
   por carga do overview. Fora de request (guards/crons) cai no caminho direto.
2. **`TtlCache`** (Map com TTL, sem dependências) num `AppCacheModule` global. Cacheia
   `payment-fees` e `transaction-categories` por org (TTL 1h), invalidando dentro do método de
   escrita do próprio repositório (upsert/create) → invalidação completa e futuro-prova.

## Consequências

- Ambiente de teste com **custo zero**; produção só gera custo quando ligada.
- O backend roda em qualquer host com Docker (portátil entre Render/Railway/etc.).
- `TtlCache` é **por instância**: ao escalar para múltiplas réplicas, trocar por Redis
  (cache compartilhado) e mover a invalidação para um store comum.

## Follow-ups deliberadamente fora deste escopo

- **Cache da lista de membros**: descartado por ora. São 8 caminhos de escrita e vários métodos do
  repo recebem só `memberId` (sem `orgId`), tornando a invalidação frágil; cache de papéis/
  permissões com defasagem é risco de **correção**, não só perf. O memo por request já cobre o
  lookup repetido no caminho quente.
- **Cache do analytics do overview**: invalidação acoplada a todo write de transação/serviço —
  reavaliar com event emitters quando virar gargalo.
- **Redis**: só ao escalar para multi-réplica ou quando p95 de leitura degradar.

## Relacionado

- `.memory/supabase-coupling.md` — mapa de acoplamento (SEC-3), base do veredito de self-host.
- ADR-0005 (multi-tenant RLS), ADR-0009 (feature flags: e-mail/cron desligados por padrão).
- `docs/deployment.md` — passo a passo operacional do primeiro deploy.
