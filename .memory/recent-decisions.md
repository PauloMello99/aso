# Decisões Recentes

Índice rápido — ver `.memory/adr/` para detalhe completo.

| #        | Decisão                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Data       | Status                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------- |
| ADR-0001 | Turborepo como estrutura de monorepo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 2026-06-06 | Aceito                                        |
| ADR-0002 | RAG local com Qdrant + Ollama + MCP Server                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 2026-06-06 | Aceito                                        |
| ADR-0003 | Drizzle ORM com migrator customizado (suporte a rollback)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 2026-06-06 | Aceito                                        |
| ADR-0004 | Arquitetura NestJS com use-cases por operação                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 2026-06-06 | Aceito                                        |
| ADR-0005 | Multi-tenancy: DB único + org_id + RLS                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 2026-06-06 | Aceito                                        |
| ADR-0006 | Clean Architecture + SOLID no backend NestJS                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 2026-06-08 | Aceito                                        |
| ADR-0007 | Feature-Based Architecture no frontend Next.js                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 2026-06-08 | Aceito                                        |
| ADR-0008 | RAG/memória obrigatória com servidor MCP `ink-memory`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 2026-06-13 | Aceito                                        |
| ADR-0009 | Feature Flags para liberação controlada de recursos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 2026-06-13 | Aceito                                        |
| ADR-0010 | Caixa: livro append-only com erratas + saldo por agregação                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 2026-06-16 | Aceito                                        |
| ADR-0011 | Topologia de deploy (staging/prod) + caching in-memory sem Redis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 2026-06-27 | Aceito                                        |
| ADR-0012 | E-mail transacional: React Email + módulo `mail` dedicado (auth fora do GoTrue)                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 2026-06-28 | Aceito                                        |
| ADR-0013 | super_admin age como owner de qualquer org (bypass no miss-path; banner; audit→PLAT-3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 2026-06-29 | Aceito                                        |
| ADR-0014 | Rastreamento de erros: Better Stack (front + back)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 2026-06-30 | Aceito                                        |
| ADR-0015 | RAG: bge-m3 híbrido (dense+BM25+RRF), parent-document, código TS, Qdrant compartilhado com larmony                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 2026-07-15 | Aceito                                        |
| ADR-0016 | Billing Stripe (M11): trial via Checkout com cartão, comp local, desconto via Coupon API, tier único `standard` paid-only, `ActiveSubscriptionGuard` por-controller                                                                                                                                                                                                                                                                                                                                                                                     | 2026-07-18 | Aceito                                        |
| ADR-0017 | Rebrand ASO: identidade visual teal (paleta larmony), Inter, tokens semânticos success/warning/info, telas padronizadas                                                                                                                                                                                                                                                                                                                                                                                                                                 | 2026-07-19 | Aceito                                        |
| ADR-0018 | Conformidade legal Tier 1: divisão controlador (ASO)/operador (estúdio), sem banner de cookies, consentimento versionado e snapshotado (signup + anamnese), identificação do fornecedor no footer                                                                                                                                                                                                                                                                                                                                                       | 2026-07-27 | Aceito                                        |
| ADR-0019 | Rebrand v2: paleta steel/azul-aço (supersede a cor do ADR-0017), domínio assessorink-so.com, SEO/assets de marca (public/, robots, sitemap, noindex), rename do repositório                                                                                                                                                                                                                                                                                                                                                                             | 2026-08-01 | Aceito                                        |
| ADR-0020 | Anamnese: sidebar de topo (module `services`, `MODULE_KEYS` intacto), gate de versão vigente em runtime sem migration, auto-vínculo via `findLinkable` (sem seletor manual), DTOs explícitos nunca a entidade crua                                                                                                                                                                                                                                                                                                                                      | 2026-08-04 | Aceito                                        |
| ADR-0021 | Support (Fatia A): escritas privilegiadas do portal (create/responder/reabrir/anexo) via `DRIZZLE_ADMIN` escopado (org_id do path autorizado por `OrgMembershipGuard`) em vez de RLS/trigger por coluna — exceção deliberada à regra geral, após 3 rodadas de correção incremental via RLS/trigger (migrations 0039→0041→0042), revertidas na 0043                                                                                                                                                                                                      | 2026-08-10 | Aceito                                        |
| ADR-0022 | Support (Fatia C): tickets órfãos (`org_id` nullable, RLS ramificada explicitamente, INSERT exclusivo de `DRIZZLE_ADMIN`) + e-mail-to-ticket via Resend Inbound (dedupe por `email_id` UNIQUE claim+escrita na mesma transação, threading por plus-address sempre confirmado contra `requesterEmail`, vínculo a org sempre manual pelo super_admin) — Turnstile fail-closed no formulário público, Svix sem bypass no webhook                                                                                                                           | 2026-08-15 | Aceito                                        |
| ADR-0023 | Billing (catálogo Stripe, super_admin): `billing_plans` no banco vira fonte de verdade (sync não rotaciona mais preço automaticamente, só reporta `drift`); Price/Coupon são imutáveis no Stripe pós-criação — "editar" é sempre criar novo + `transfer_lookup_key` + arquivar separado (Price) ou editar só o Promotion Code (Coupon); discriminador anti-corrida no webhook evita persistir o Price arquivado de uma rotação                                                                                                                          | 2026-08-15 | Aceito (parcialmente superseded por ADR-0024) |
| ADR-0024 | Billing multi-preço por intervalo (`billing_plan_prices`, migration 0048, índices únicos parciais `WHERE active`), migração automática de assinantes na rotação (`RotatePlanIntervalPriceUseCase`, sem transação cross-repository), reconciliação periódica via cron invertendo a direção do ADR-0023 (Stripe manda, `ReconcilePlanCatalogUseCase` self-throttled a cada 3 dias via `cron_job_state`), endpoint público `GET /public/billing/plans` (feature-flag `PUBLIC_PRICING_ENABLED`), landing com ISR (`numReplicas=1` do ADR-0011 torna seguro) | 2026-08-16 | Aceito                                        |

## Decisões/registros recentes (sem ADR)

- **2026-06-22 — Roadmap & situação consolidados**: `roadmap.md` é a fonte de follow-up
  com stakeholders (módulos prontos + backlog tarefa a tarefa, _Planejar_ vs _Backlog_).
  Espelhado no Notion. Documentação de produto anterior estava defasada.
- **2026-06-22 — TDD obrigatório por module**: regra em `domain-rules.md` (test-first;
  unitário + integração por module). Adoção plena é um "ataque de testes" no backlog (TEST-2).
- **2026-06-22 — Visibilidade por funcionário** concluída em Serviços/Agenda/Caixa
  (owner vê tudo + lança em nome de). Ver `domain-rules.md` e
  `docs/testing/employee-visibility-tests.md`.
- **2026-07-19 — Design system ASO formalizado** (adendo ao ADR-0017): referência completa
  em `docs/design/design-system.md` + checklist operacional em
  `.claude/skills/aso-design/SKILL.md`. Fonte canônica é o bundle de handoff de design;
  nada de novo foi decidido, apenas documentado (tokens, componentes, conteúdo, ícones).
  `SectionCard`/`KpiCard` seguem como padrões locais de `overview-page.tsx`, não extraídos
  para `shared/components/ui/` — ver adendo do ADR-0017.
- **2026-08-19 — P-2 fatia 2/4, backend do módulo `customer-self-service`**: estende o
  padrão de ADR-0021 (escrita privilegiada via `DRIZZLE_ADMIN` escopada por `org_id`
  explícito) de `support` para `customers` — primeira vez que um caminho público
  (SEM sessão nenhuma, diferente do ADR-0021 que é autenticado) escreve na tabela
  `customers`. Ver seção "M-P2b" em `domain-rules.md` para o desenho completo (retry por
  marcador `customer_self_registrations.customer_id`, `linkCustomer` com `orgId` em
  `anamnesis_responses`, distinção de unique violation por nome de constraint). Revisado
  por `database-guardian` (1 rodada, `changes_required` → corrigido) e `reviewer` (1
  rodada, `changes_required` → corrigido). Não abriu ADR novo por ser extensão direta de
  um padrão já registrado, não uma decisão arquitetural nova.
- **2026-08-19 — P-2 fatia 3/4 iniciada em worktree dedicado**: design + frontend das 3
  telas de auto-cadastro/atualização de cliente (fatias 1/4 e 2/4 já commitadas — `3725767`,
  `2eb078a`). Ver tabela de milestones em `docs/planning/2026-08-19-meeting-backlog.md`.
- **2026-08-19 — P-1 correção pós-entrega: gotcha de `db.transaction()` aninhado sobre RLS**:
  diagnosticado (reprodução real, não hipótese) o motivo do bug "comissão sempre salva com
  percent 0/mode null" — commit prematuro da transação por-request ao aninhar
  `db.transaction()` sobre a conexão `DRIZZLE` dentro de `supersede()`, resetando
  `request.jwt.claims` e poluindo o `TtlCache` com leitura vazia. Gotcha completo em
  `domain-rules.md` (seção RLS). Mesmo padrão não auditado em outros 4 repositórios
  (`drizzle-org`/`drizzle-member`/`drizzle-ticket`/`drizzle-anamnesis-form`). Config de
  comissão também será realocada de Configurações › Caixa para o dialog de Permissões do
  funcionário (Configurações › Geral) — decisão de UX do usuário, corrige a queixa de
  "localização confusa". `database-guardian` consultado antes do `backend-implementer`
  (decisão de forma do fix e desenho do endpoint) por tocar RLS/tenancy.
- **2026-08-19 — P-1-FIX concluído**: fix estrutural aplicado (Proxy `DRIZZLE` com
  `SAVEPOINT` em vez de `.transaction()` aninhado), cache de `findActiveByOrg` removido,
  comissão movida pro dialog de Permissões (restrita a `employee`, também visível para
  `owner` por decisão do usuário — corrige comissão órfã na promoção). `database-guardian`
  (2 rodadas) e `reviewer` (1 rodada) aprovaram após correções. Detalhe técnico completo em
  `domain-rules.md` (GOTCHA seção RLS); status no backlog em
  `docs/planning/2026-08-19-meeting-backlog.md`.
- **2026-08-20 — P-2 fatia 3/4 concluída (frontend)**: menu de auto-cadastro/atualização no
  módulo de Clientes + páginas públicas `/customer-registration/:token` (2 passos, dados
  cadastrais + ficha de anamnese, único submit) e `/customer-update/:token` (1 passo,
  atualização PARCIAL via `dirtyFields` do react-hook-form — nunca envia `gender` se o
  campo não for tocado, já que o GET de atualização não devolve o gênero atual do cliente;
  regra confirmada pelo `reviewer`). `SignaturePadField` passou a ser exportado por
  `features/anamnesis/index.ts` (reuso cross-feature). `reviewer`: `approved_with_notes`.
  Commit `4c7f308` na branch `worktree-p2-fatia3-customer-self-service-frontend`, mergeada
  em `development`.
- **2026-08-20 — P-2 fechada (pendências menores) + gotcha novo de post-commit hooks no
  audit log**: 3 achados `low` do `reviewer` na fatia 3/4 resolvidos em `3cc1e15`
  (`fetchAddressByCep` duplicado entre `features/clients` e `features/customer-self-service`
  promovido a `shared/lib/viacep.ts`; hint no Select de gênero explicando que o valor atual
  é preservado se o campo não for tocado; 4º estado `error` em `public-lookup-state.ts`
  distinguindo falha de transporte de token de fato inválido). Em paralelo, `f48e611`
  corrigiu um risco generalizável identificado a partir do fix de P-1 (SAVEPOINT): efeitos
  colaterais não-transacionais (como o INSERT do audit log via `DRIZZLE_ADMIN`, autocommit)
  que rodassem durante a transação do request podiam persistir mesmo se o COMMIT real
  falhasse depois. `database.module.ts` ganhou `postCommitHooks`/`registerPostCommit(fn)`:
  dentro de um request, o efeito só roda **depois** do `COMMIT` ter sucesso; `AuditService.log`
  passou a usar isso. `database-guardian` achou uma regressão real na revisão: `DeleteOrgUseCase`
  logava com o `orgId` da org que a mesma transação apagava — pós-commit a FK
  `audit_logs.org_id → organizations.id` rejeitava o INSERT (engolido pelo catch);
  corrigido gravando `orgId: null` + id no `metadata`/`entityId`. Gotcha completo (incluindo
  a armadilha de `rlsStorage.getStore()` vazio dentro do hook) em `domain-rules.md`, seção
  RLS. Sem ADR novo — extensão direta do padrão SAVEPOINT do fix de P-1, não uma decisão
  arquitetural nova. Com isso, **P-2 está integralmente concluída e mergeada em `main`**
  (via `staging`/`development`, PRs #59/#60).
- **2026-08-21 — Merge `features/dev-workflow-issues-d28237` → `development` finalizado**
  (commit `53b0af9`, checkout principal `C:/Repos/Pessoal/aso`). Estava parado com 2
  conflitos: `.memory/domain-rules.md` (3 blocos, todos inserção lado a lado sem
  sobreposição real — gotcha do `lookup_key` self-heal + `highlighted`/`features` da branch
  nova, seções de Comissão/P-1 e M-P2b já em `development`) e
  `apps/backend/drizzle/migrations/meta/_journal.json` (já resolvido manualmente no disco,
  faltava só `git add`). A branch trazia `0051_billing_plans_presentation_fields.*`, mas essa
  numeração colidia com `0051_member_commissions`/`0052`/`0053` já mergeados — a renumeração
  para `0054` já estava feita no disco (mesmo conteúdo), só faltava finalizar com
  `git rm`/`git add` (o "encoding corrompido" que `Get-Content` do PowerShell mostrava era
  artefato do console, o arquivo em UTF-8 estava correto). Também corrigida uma indentação
  perdida em `docs/gotchas.md` (regressão de formatação da própria branch, não conflito).
  Conteúdo da branch: self-heal de `lookup_key` na rotação de preço
  (`PlanPriceLinkageService`), campos `highlighted`/`features` editáveis em `billing_plans`,
  upload de imagem com crop+compressão (`image-cropper.tsx`/`image-crop-dialog.tsx`/
  `image-compression.ts`), fix de `jest.config.js rootDir` no Windows com worktree em path
  com segmento `.claude`. Validado pós-merge: check-types + lint + test (102/102 suites
  backend, 610 testes; 34/34 frontend, 279 testes) + build, tudo verde. Sem push.
