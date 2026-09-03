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
| ADR-0025 | Campanhas de e-mail por gatilho (T6 Bloco A): módulo `campaigns` próprio (não reusa `NotificationService`), opt-out por cliente em `customer_email_preferences` (migration 0061, `unsubscribe_token` que nunca rotaciona), `org_campaign_settings` (migration 0062) + env `CAMPAIGNS_ENABLED` como gate — sem o módulo de Feature Flags (ADR-0009), `campaign_sends` (migration 0063) append-only sem FK nem RLS, copy custom texto-puro com allowlist de tokens, rodapé fixo via `footerOverride`, fuso `America/Sao_Paulo` nos gatilhos de data (D8) | 2026-09-01 | Aceito (parcialmente superseded pelo Addendum 2026-09 — rework T6) |
| ADR-0026 | Paginação offset-based nas listagens de customers/services/cashier(transactions)/materials/stock_movements: `page`/`limit` clampados sem exceção, `count()` exato por request, ORDER BY com desempate por `id`, busca de `services` migrada de filtro em memória para SQL, use-case irmão `*PageUseCase` ao lado do original (que export/overview continuam consumindo intocado), endpoints `.../options` (cap 1000 + `truncated`) para selects de apoio | 2026-09-03 | Aceito |

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
- **2026-08-30 — Token efficiency do Claude Code documentado** (`docs/ai/token-efficiency.md`):
  `caveman` (`JuliusBrussee/caveman`) já instalado e ativo (marketplace no `~/.claude/settings.json`,
  `enabledPlugins.caveman: true` no `.claude/settings.json`); default do repo fixado em
  `lite` via `.caveman.json` na raiz (`/caveman full` por sessão em discussão longa).
  Engajamento por sessão ainda não confirmado — checar com `/caveman-stats`. `caveman`
  reduz **só output** (~14–21% de sessão em workload verboso, net-negativo em Q&A curto,
  custa ~1–1.5k input/turno). `rtk` (Rust Token Killer) **não instalado** — exige baixar
  binário Windows + `rtk init -g` pessoal (não escopo de projeto: quebraria Bash de quem
  não tem o binário); só cobre `git`/`grep`/`find`, não `pnpm`/`turbo`/`vitest`. Alavancas
  maiores registradas mas não alteradas: podar `enabledMcpjsonServers` (10 servidores, 4
  quebrados), `opus[1m]`, `alwaysThinkingEnabled`.
- **2026-08-22/23 — M10d: gate de versão vigente + reenvio inteligente + envio de cópia por
  e-mail da ficha de anamnese** (feature nova, via skill `development-workflow`, classificada
  complexa). Migration `0055_audit_action_anamnesis_resend_copy` (2 valores novos de
  `audit_action`; renumerada de 0054 no meio do trabalho por colisão com
  `0054_billing_plans_presentation_fields`, que chegou de um merge concorrente de
  `development` para dentro desta branch). `SendAnamnesisInviteUseCase` reescrito: bloqueia
  com 409 quando o cliente já respondeu a versão vigente (`findSubmittedForVersion`,
  independente de vínculo com serviço) e reutiliza convite pendente não expirado da mesma
  versão em vez de sempre deletar+recriar (sem estender `expiresAt`). Novo
  `SendAnamnesisResponseCopyUseCase` (`POST /orgs/:orgId/anamnesis-responses/:id/send-copy`)
  envia por e-mail, ao endereço cadastrado do cliente, a signed URL do PDF já gerado no
  submit (nunca regenera). 3 decisões de produto confirmadas com o usuário: "notificar quem
  solicitou" = erro 409 síncrono (sem notificação in-app); reenvio não estende validade;
  PDF só para e-mail cadastrado (sem destinatário arbitrário). `database-guardian`
  (`approved_with_notes`, 3 achados low) e `reviewer` (`approved_with_notes`, 2 achados
  medium — PII de e-mail em log, estado obsoleto de sucesso/erro no viewer entre fichas
  diferentes — e vários low) revisaram; os 2 medium + 2 low baratos (throttle assimétrico,
  mapper de erro sem `SUBSCRIPTION_REQUIRED`) foram corrigidos numa segunda rodada. Detalhe
  técnico completo em `domain-rules.md`, seção "M10d". Validado: check-types + lint + test
  (104/104 suites backend, 628 testes; 36/36 frontend, 292 testes) + build, tudo verde.
  Branch `features/continuar-progresso-de1de1`, sem commit ainda (aguardando pedido do
  usuário).
- **2026-08-31 — Espelho local do desconto do Stripe passa a ser fiel** (revisão 30-08,
  módulo `subscriptions`): `toNormalizedSubscription` hard-codeava `stripeCouponId`/
  `discountPercent` como `null`, causando drift eterno + write thrash no reconcile e
  zeragem do cache pelo webhook/`MigrateSubscribersToPriceUseCase`. Opção A: o gateway
  resolve o desconto real do Stripe (`expand: ["discounts"]` + `coupons.retrieve`
  condicional; helpers `extractSubscriptionDiscountRef`/`mapCouponToDiscount`/
  `resolveSubscriptionDiscount`), com telemetria nova
  (`BILLING_SUBSCRIPTION_DISCOUNT_DRIFT_OVERWRITTEN` a cada sobrescrita no reconcile, por
  ADR-0024). Sem ADR novo — detalhe completo no ADR-0016
  (`.memory/adr/0016-billing-stripe-assinatura.md`), Addendum 2026-08-31 "espelho fiel do
  desconto do Stripe", que substitui o item 4 do Addendum T4-F2 (2026-08-31).
- **2026-08-31 — T4-F5: fluxo Stripe endurecido (fecha o T4)** (revisão 30-08, módulo
  `subscriptions`). **Bloco A** (`d7f7c49`): `refund.updated` consumido, `has_more` paginado
  de verdade, `ReconcileSubscriptionsUseCase` ganha `diffs[]` por campo + `captureMessage`
  só para campos monetários (novo `BILLING_SUBSCRIPTION_PRICE_DRIFT_OVERWRITTEN`) + detecção
  de `stripe_price_id` órfão, guard anti-flap `shouldSkipStripeStatusOverride` simétrico
  webhook↔cron. **Bloco B** (`8244632`): `ReconcileRefundsUseCase` (job de cron
  self-throttled, molde ADR-0024) — varredura global `refunds.list({created:{gte:now-7d}})`
  com **guarda de inserção** (não ingere refund alheio — conta Stripe pode ser
  compartilhada) + passe de re-resolução de `org_id` órfão. **Exceção D4 ao append-only de
  `billing_refund_events`**: `resolveOrgIdWhereNull` (por charge) e
  `backfillOrgIdFromResolvedSiblings` (por refund, raw `UPDATE ... FROM`) preenchem `org_id`
  quando NULL, nunca `status`/`amount_cents`/`occurred_at`/`reason` — registrada em
  `domain-rules.md`. `GET /admin/orgs/:orgId/subscription/refunds` paginado
  (`SubscriptionRefundsPage`, sem `id`/`org_id` internos). Sem ADR novo — ADR-0016 addenda
  "T4-F5 Bloco A" e "T4-F5 Bloco B". Dependência load-bearing: `subscriptions.stripe_customer_id`
  UNIQUE ancora o backfill contra misatribuição entre orgs. T4-F4 (cancelamento pelo
  super_admin) segue bloqueado (converge com T3).
- **2026-09-01 — T6 Bloco A: backend do MVP de campanhas de e-mail por gatilho**
  (`ADR-0025`). Módulo novo `apps/backend/src/modules/campaigns/` (Clean Architecture),
  disparo via `RunCampaignTriggersUseCase` no tick único de cron, self-throttled 20h por
  `cron_job_state`. 3 gatilhos: `post_service`/`birthday`/`inactivity`. Migrations
  `0061_customer_email_preferences` (opt-out por cliente, `unsubscribe_token` que não
  expira nem rotaciona, RLS só SELECT), `0062_org_campaign_settings` (flags `*_enabled` +
  copy custom por gatilho, default `false`), `0063_campaign_sends` (enums
  `campaign_trigger_type`/`campaign_send_status`, log append-only sem FK nem RLS — uma
  linha terminal por tentativa). Gate = env `CAMPAIGNS_ENABLED` + flags por org — **não**
  puxa o módulo de Feature Flags (ADR-0009, decisão de escopo). Copy custom é texto puro
  (`<Text>` do React Email, `dangerouslySetInnerHTML` proibido) com allowlist de 2 tokens
  em passe único; rodapé de descadastro fixo via `footerOverride` do `base-layout`.
  Endpoint público `GET/POST /public/campaigns/{preferences,unsubscribe}/:token` (sem
  gate de `CAMPAIGNS_ENABLED` — o kill-switch para só o envio, nunca o descadastro).
  Primeira decisão de fuso explícita em lógica de negócio do repo: `America/Sao_Paulo`
  nos gatilhos de data (D8). Validado: check-types + lint + test (817 testes backend, 37
  suites frontend) + build verdes; migration round-trip ×2; `database-guardian`
  (`changes_required` → aplicado) e `reviewer` (`approved_with_notes` → 3 medium + 4 low
  aplicados). **Pré-requisito de ativação**: Bloco B (telas de config do dono + página de
  preferências do cliente em `/preferencias-email/:token`) antes de `CAMPAIGNS_ENABLED=true`
  — link de descadastro precisa de destino vivo (LGPD). Commits pendentes (aguardando
  pedido do usuário).
- **2026-09-01 — Rework T6 de campanhas de e-mail** (`ADR-0025`, **Addendum 2026-09** —
  corpo original preservado como histórico; ver
  `.memory/adr/0025-campanhas-email-por-gatilho.md`). A feature foi retrabalhada **antes de
  ir live**: `org_campaign_settings` (0062, 1 linha/org) **dropada** pela migration `0067`
  e substituída por `campaigns` (migration `0066`) — tabela CRUD com N linhas/org, UMA por
  gatilho (`UNIQUE (org_id, trigger)`), nova policy de DELETE, sem backfill. **D5
  revertida**: o corpo do e-mail deixa de ser texto puro e passa a **Tiptap-JSON**, com
  duas barreiras — walker de allowlist fechada no servidor (`validateCampaignBody`, 400
  `CAMPAIGN_INVALID_BODY`) + renderer React Email sem `dangerouslySetInnerHTML`
  (`mail/application/render-campaign-body.tsx`); assunto (texto puro) e rodapé fixo
  inalterados. Novo bucket **`campaign-images`** (migration `0068`, PÚBLICO — cliente de
  e-mail não autentica) para upload de imagem do corpo (owner-only, não grava no banco; o
  walker exige `src` com prefixo do bucket). `campaign_sends` (0063) e o opt-out (0061)
  **inalterados** — recriar campanha do mesmo gatilho NÃO reenvia (dedupe herdado).
  Auditoria reusa a action `campaign_settings_updated` (enum da migration `0065`, sem
  migration nova) com `metadata.operation`. Frontend: aba top-level "Campanhas"
  (owner-only), CRUD com editor Tiptap. **Em aberto**: serviço de moderação de conteúdo por
  ML/LLM (não adotado — custo de manutenção); cleanup de imagens órfãs no DELETE (deixadas
  de propósito). Migrations `0066`/`0067`/`0068` escritas à mão. Sem ADR novo — Addendum ao
  ADR-0025. Commits pendentes (aguardando pedido do usuário).
- **2026-09-02 — Taxa de meio de pagamento por funcionário + label de classificação de
  membro** (SEM ADR novo — decisão do coordenador: extensão direta dos padrões
  `0051_member_commissions`/ADR-0010/ADR-0013, sem trade-off arquitetural). Migrations à
  mão `0069_member_classification` (`org_memberships.classification`, enum
  `resident`|`guest` nullable — **display-only**, proibido ler em regra/guard/RLS; editável
  por owner/super_admin) e `0070_member_payment_fees` (`org_member_payment_fees` versionado
  imutável por `(org, user, method)` + snapshot `fee_*` em `transactions`). Decisão
  central: **override + fallback da org, sem backfill** — a tabela nasce vazia, cada
  funcionário usa `org_payment_fees` até receber override explícito; `resolveFee` resolve
  membro → org → nenhuma; a comissão em modo `net` passa a refletir a taxa do funcionário.
  Convenções em `domain-rules.md` (seções "Roles dentro da org", "Taxa de cartão por
  profissional", "Comissão/repasse por profissional", "Cobertura de auditoria do caixa").
  Commits pendentes (aguardando pedido do usuário).
- **2026-09-03 — Paginação offset-based em customers/services/cashier(transactions)/
  materials/stock_movements** (`ADR-0026`), motivada pelo volume real da importação
  Ink House (724 clientes, 1398 serviços, 3840 transações). Backend: `GET`s de listagem
  passam a devolver `{ data, total, page, pages }`; `page`/`limit` clampados
  (`resolvePageRequest`/`buildPaginated`/`parsePageParam` em `common/pagination/`), nunca
  `DomainException`; `count()` exato por request; ORDER BY sempre com desempate por `id`.
  Busca `q` de `services` migrada de `.filter()` em memória para `ILIKE` SQL — pré-
  requisito para paginar sem perder resultados. Cada domínio ganhou um use-case irmão
  `List<Entity>PageUseCase` (exceto `stock_movements`, migrado direto): os use-cases
  originais (`ListTransactionsUseCase`/`ListServicesUseCase`/`ListCustomersUseCase`/
  `ListMaterialsUseCase`) permanecem intocados porque `GetOverviewUseCase`/
  `GetOverviewAnalyticsUseCase` e todos os `Export*UseCase` dependem do conjunto
  completo — descoberta do `planner` não prevista no pedido original, evitou truncar
  KPIs/exports silenciosamente. Endpoints novos `GET .../customers/options` e
  `GET .../materials/options` (sem paginação, cap 1000 + `truncated`) evitam que os
  selects de Cliente/Material em `services-page`/`event-form`/
  `stock-verification-page` fiquem incompletos ao herdar o limite da listagem paginada;
  `ServiceForm` mantém `useCustomers` completo onde precisa de `birthDate` (verificação
  de idade), usando `useCustomerOptions` só no filtro. Frontend: `PaginationBar`
  compartilhado (`@/shared/components/pagination-bar`), `keepPreviousData` em todos os
  hooks paginados, reset de página em qualquer mudança de filtro/busca, KPIs que liam
  `lista.length` corrigidos para ler `total` do envelope (ou uma segunda chamada leve
  com `limit: 1` para um KPI de subconjunto, ex. "Ativos"/"Estoque baixo"). Receita
  canônica para novas listagens em `domain-rules.md` ("Paginação — toda listagem nova
  de recurso org-scoped nasce paginada"). Validado: check-types + lint + test + build
  verdes em cada um dos 22 passos de implementação (backend e frontend intercalados por
  domínio). 23 commits numa única branch/PR (`features/lucid-volta-axvjyd`).
