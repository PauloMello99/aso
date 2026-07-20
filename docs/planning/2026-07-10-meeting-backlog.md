# Backlog da reuniao de 10/07/2026 — revisao do MVP (IOS)

> Fonte: `meeting-07-10-26.md` (Parte I, 51 min) e `meeting-07-10-26-summary.md`
> (Parte II, 32 min) — arquivos **untracked** na raiz do repo (nao commitados; podem
> conter dado pessoal, ver "Pendencias de repositorio" no final).
> Participantes: Paulo (dev), Ruan (stakeholder).
>
> **STATUS DESTE DOCUMENTO (atualizado em 2026-07-18): M0 a M11 estao implementados,
> testados, revisados e MERGEADOS em `development`** (M10 em 3 fatias: M10a/M10b/M10c;
> M11 em 3 fatias: M11a/M11b/M11c — todas mergeadas). Versao atual (`apps/backend` e
> `apps/frontend`): **0.18.0**. **Backlog original desta reuniao encerrado** — M11
> (Stripe: trial + assinatura) era o unico item restante. Este arquivo continua sendo a
> fonte de verdade historica; para o proximo ciclo de trabalho, ver `.memory/roadmap.md`.

## Contexto

Reuniao de revisao pos-testes internos do MVP. Objetivo: refinar o produto ate o fim de
julho/2026, free trial de 2 meses (ago–set) para estudios selecionados, lancamento
publico em outubro. Nome oficial do produto: **IOS (Assessoria Inc. Operational
System)**.

---

## Como retomar (leia isto primeiro)

1. **Protocolo de execucao**: cada milestone segue a skill `development-workflow`
   (`.claude/skills/development-workflow/SKILL.md`) — classificar risco → menor fluxo de
   agentes suficiente (`locator` → `planner` se complexa → `implementer` → `tester` →
   `database-guardian` se tocar schema/migration → `reviewer` se complexa/alto risco).
   Todas as milestones abaixo ja vem pre-classificadas na tabela de milestones.
2. **Branches e merges (atualizado 2026-07-17)**: M0 a M10 foram todos mergeados em
   `development` (M2 `f6d5733`, M3 `1add473`, M4 `a1db104`, M5 `b74546a`/PR #20, M6
   `b766b4b`/PR #22, M7 `1225024`/PR #23, M8 `370f6db`/PR #25, M9 `2960c53`/PR #26, M10a
   PR #27, M10b PR #28, M10c PR #29). A regra original "sem push, sem PR aberto por mim
   — so o Paulo" **mudou a partir do M2**: Claude pode pushar, abrir PR e (desde o M2)
   mergear em `development` quando o CI estiver verde. Ao iniciar o M11, crie
   `features/m11-stripe-billing` a partir de `development` (ja atualizada, sem branch
   empilhada pendente).
3. **Validacao padrao** (nao ha suite e2e): `pnpm check-types` + `pnpm lint` +
   `pnpm --filter <app> test` + build direcionado. Ver "Infra de testes" abaixo para
   detalhes — inclui o registro da falha de build do frontend com Turbopack, ja
   **RESOLVIDA no M2** (nao e mais um problema preexistente conhecido).
4. **Testes obrigatorios em toda entrega** (pedido explicito do Paulo no kickoff): cada
   milestone deve sair com specs cobrindo a regra de negocio nova, nao so
   check-types/lint.
5. **Commits**: Conventional Commit em pt-BR sem acentos, com escopo e referencia ao
   milestone (ex.: `fix(auth): ... (M1)`), corpo explicando o porque. Ver os 3 commits ja
   feitos (`61eae5d`, `eadf18f`, `57bee7d`) como referencia de tom/formato.
6. **Versionamento**: apps em `0.1.0` originalmente; M0 bump para `0.2.0`, M1 para
   `0.3.0`. Cada milestone concluido = +1 minor em `apps/backend/package.json` e
   `apps/frontend/package.json` (mesmo que so um dos apps tenha mudado — mantem os dois
   sincronizados, convencao adotada nas duas primeiras milestones).
7. **Duvidas de contexto**: pare e pergunte ao Paulo. Nao adivinhe requisito de negocio
   (dinheiro, LGPD, RLS, contratos com Stripe). Ha uma secao "Decisoes tomadas" e
   "Pendencias" no final — checar antes de perguntar algo ja respondido.

---

## Estado atual (o que ja foi feito)

### M0 — Infra de testes ✅ mergeado

- Branch `features/m0-test-infra`, commits `61eae5d` (doc do backlog) e `eadf18f`
  (infra em si).
- **Backend**: `apps/backend/jest.config.js` (preset ts-jest, testEnvironment node,
  testMatch `<rootDir>/src/**/*.spec.ts`, `setupFiles: ["reflect-metadata"]` —
  necessario porque use-cases/guards Nest usam decorators `@Injectable()`/`@Inject()`
  que chamam `Reflect.defineMetadata` no import; sem o polyfill carregado antes do
  Jest, o import quebra). Script `"test"` em `apps/backend/package.json`.
- **Frontend**: `apps/frontend/vitest.config.ts` (plugin react, jsdom, globals true,
  setupFiles `./vitest.setup.ts`, alias `@` → `./src` via `fileURLToPath`),
  `apps/frontend/vitest.setup.ts` (importa `@testing-library/jest-dom/vitest`). Script
  `"test": "vitest run"`.
- **Turbo**: task `"test": { "cache": false }` em `turbo.json`; script `"test": "turbo
  run test"` na raiz.
- **pnpm**: `pnpm-workspace.yaml` — `unrs-resolver: true` em `allowBuilds` (exigido pelo
  Jest 30; sem isso `pnpm install` falha com `ERR_PNPM_IGNORED_BUILDS`).
- **Specs de referencia** (padrao a seguir em toda milestone futura):
  - `apps/backend/src/modules/cashier/application/use-cases/reverse-transaction.use-case.spec.ts`
    — fake de repositorio via objeto literal + `jest.fn()` em cada metodo, tipado como
    `jest.Mocked<IRepo>` via `as unknown as`. Cobre caminho feliz + 3 `DomainException`.
  - `apps/frontend/src/shared/lib/utils.spec.ts` — spec puro de `cn()`, sem `@repo/*`
    (ha um problema conhecido de linking de workspace packages neste ambiente — NAO
    importar `@repo/*` em testes de frontend).
- **IMPORTANTE**: o `CLAUDE.md` da raiz do projeto ainda diz "o projeto ainda nao tem
  suite de testes automatizada" — essa frase esta **desatualizada** desde o M0. Ignore-a
  ao classificar a validacao de qualquer milestone daqui pra frente; use
  `pnpm --filter <app> test` normalmente. (Vale considerar atualizar o CLAUDE.md numa
  fatia futura, mas isso nao bloqueia nada.)

### M1 — Fix critico: desacoplar permissoes (B1) ✅ mergeado

- Branch `fix/m1-permissions-decoupling` (em cima de M0), commit `57bee7d`.
- **Problema**: funcionario sem a flag de modulo `clients`/`stock` nao conseguia
  selecionar cliente/material no lancamento de servico — a flag bloqueava tambem os
  GETs de listagem usados pelo formulario de servico, nao so o CRUD de gerenciamento.
- **Solucao**: novo decorator `@AllowAnyOrgMember()`
  (`apps/backend/src/modules/auth/decorators/require-module.decorator.ts`) grava um
  sentinel (`ALLOW_ANY_ORG_MEMBER`, string `"__allow_any_org_member__"`) na MESMA
  metadata key de `@RequireModule` (`REQUIRE_MODULE_KEY`); em nivel de handler, esse
  sentinel vence a exigencia de classe via `Reflector.getAllAndOverride([handler,
  class])`, que ja era usado pelo `OrgModuleGuard`
  (`apps/backend/src/modules/auth/guards/org-module.guard.ts`). O guard so libera pelo
  sentinel **apos** validar sessao (`request.user`), `orgId`, membership + `enabled` no
  banco — ou seja, nao pula nenhuma verificacao de tenancy/sessao, so pula o
  `hasModuleAccess` do modulo especifico.
- **Aplicado em**: `customers.controller.ts` → `list()` e `origins()`;
  `materials.controller.ts` → `list()`. Escrita (create/update/delete/export/etc.)
  continua exigindo a flag do modulo, intocada.
- **Specs**: `org-module.guard.spec.ts` (7 casos: employee sem flag bloqueado; employee
  sem flag passa com `@AllowAnyOrgMember`; owner sempre passa; employee com flag passa;
  metadata sentinel confirmada via `Reflect.getMetadata` nos controllers reais; **2
  casos negativos adicionados apos review**: sentinel + membership vazia →
  `ForbiddenException`; sentinel + sem `user` → `ForbiddenException`) e
  `member-permissions.spec.ts` (5 casos: `hasModuleAccess` owner/employee com e sem
  flag, `isModuleKey` valido/invalido).
- **Validado**: `pnpm --filter backend test` (16/16), check-types, lint, `nest build` —
  todos verdes. Passou por locator → implementer → tester → reviewer
  (`approved_with_notes`, unico finding medium corrigido antes do commit).
- **Findings do reviewer que viraram pendencia para M3** (registrados aqui quando o M1
  foi feito; **status atualizado apos M3, ver secao "M3" abaixo**):
  - `GET /orgs/:orgId/materials` agora e acessivel a qualquer membro habilitado e
    retorna `costPerUnit`, `stockQuantity`, `minimumQuantity` + aceita filtros
    `minCost`/`maxCost` — funcionario sem a flag `stock` ve custo de material. Dentro do
    requisito do B1 (leitura liberada), mas amplia a exposicao antes do M3 (que vai
    ocultar metricas de valor do funcionario). **M3 deve decidir**: omitir `costPerUnit`
    para quem nao tem `stock`, ou criar payload de selecao enxuto (`id`, `name`,
    `categoryId`, `archivedAt`). ✅ **RESOLVIDO no M3** — `costPerUnit` (e `minCost`/
    `maxCost`) agora sao omitidos por completo (fail-closed) para quem nao tem a flag
    `stock`.
  - `GET /orgs/:orgId/customers` (`list()`) retorna a entidade completa (endereco,
    `birthDate`, `notes`) para qualquer membro — mais PII do que a selecao no form de
    servico precisa. Registrado como nota de baixa severidade, sem acao obrigatoria,
    mas vale revisitar junto com M3/M4. Nao consta entre os fatos verificados nesta
    atualizacao se foi endereçado — nem como resolvido, nem como pendente; permanece
    nota de baixa severidade em aberto ate verificacao futura.
- **Mergeado em `development`** (junto com M0, como parte da progressao M0→M10 concluida
  ate 2026-07-17).

### M2 — Restricoes e validacoes rapidas ✅ mergeado

- Commit `f6d5733`, mergeado em `development`.
- Telefone: validacao de plausibilidade com country code (B4).
- E-mail unico por org (B5): dedup automatico via migration + constraint bloqueando
  cadastros novos duplicados, **sem** opcao de "prosseguir mesmo assim" (decisao
  confirmada). Isso resolve a pendencia de dados que estava aberta (ver "Pendencias").
- Bloqueio de lancamento de servico com data futura (B6).
- Material de consumo obrigatorio no lancamento de servico — regra real de consumo
  verificada no backend, nao so array nao-vazio no form (B2/A4).
- Transferencia de caixa restrita a dinheiro/banco, sem demais metodos de pagamento
  (A1).
- Remocao total do metodo de pagamento "Creditos": enum Postgres + type TS + toda a UI
  (B7).
- Durante a sessao tambem corrigiu a falha de build/dev do frontend com o Turbopack
  (`@logtail/next`/rewrite externo) — ja documentada na secao "Infra de testes" abaixo;
  a referencia la ao M2 como origem do fix esta correta.

### M3 — Visibilidade por papel ✅ mergeado

- Commit `1add473`, mergeado em `development`.
- `GET /orgs/:orgId/materials` e a secao `lowStock` do overview agora **omitem por
  completo** (nao retornam `null`, omitem a chave) `costPerUnit` para quem nao tem a
  flag `stock`, fail-closed por padrao; `minCost`/`maxCost` tambem neutralizados para
  fechar o canal de inferencia binaria do custo oculto (A2 — fecha o finding do M1 sobre
  `costPerUnit` em materials list, ver secao M1 acima). A rota de export de materiais ja
  exige a flag `stock`, entao sempre ve custo completo.
- Botao "Excluir conta" ocultado para quem e funcionario em TODAS as organizacoes de que
  participa; quem e dono de pelo menos uma organizacao continua vendo (A3-funcionario,
  resolvido). Backend (`delete-account.use-case.ts`) nao foi alterado — continua sendo o
  guard-rail real.
- **A3-admin (pesquisa LGPD para exclusao/anonimizacao de conta de admin) NAO foi
  resolvida** — continua pendente, ver "Pendencias".

### M4 — Cadastro de cliente ✅ mergeado

- Commit `a1db104`, mergeado em `development`.
- E-mail, data de nascimento e bloco de endereco (logradouro, numero em campo proprio,
  cidade, estado) obrigatorios para toda organizacao — DTO + banco; migration resetou
  os poucos clientes de teste incompletos (autorizado pelo Paulo, sem inventar backfill
  de data de nascimento real) (A6).
- Numero separado do logradouro + autofill de endereco via ViaCEP (frontend-only,
  fallback manual para CEP invalido ou cliente nao-BR) (F1).
- Filtro de aniversariantes do mes (ignora ano/dia) + cidade/estado, sem aba propria
  (F2).
- Pagina de detalhe do cliente restaurada — rota propria com cadastro completo,
  historico de servicos e historico de transacoes via novo filtro `customerId` no
  caixa (F3). Endpoint de detalhe do cliente corrigido para exigir a flag `clients`
  (achado do reviewer).

### M5 — Categorias de caixa gerenciaveis ✅ mergeado

- Commit `b74546a`, PR #20, mergeado.
- CRUD completo de categorias de transacao (F5): coluna `is_protected` protege as 7
  categorias seed contra exclusao (rename continua liberado), endpoints PUT/DELETE
  owner-only, dialog de gestao na pagina do caixa.
- Excluir categoria em uso e permitido (`category_id` vira `null`, decisao ja aceita no
  schema); renomear para nome duplicado retorna 409.

### M6 — Agenda ✅ mergeado

- Commit `b766b4b`, PR #22, mergeado.
- Visibilidade `private`/`shared` em `calendar_events` (default `private`, sem migrar
  eventos existentes) + RSVP indo/nao-vou por membro para eventos compartilhados (F6,
  migration 0026 manual — `drizzle-kit generate` quebrado desde 0011, ver nota da
  memoria do Claude `env_migration_snapshot_gap` para detalhes tecnicos).
  Funcionario ve os proprios eventos (qualquer visibilidade) + shared de qualquer
  membro, nunca privados de terceiros. RSVP deriva `user_id` sempre da sessao.
- **B3 (bug de navegacao de meses) foi investigado e confirmado NAO reprodutivel** ao
  vivo (browser + API) — nao exigiu mudanca de codigo, mas foi investigado (ver tabela
  de Bugs: status "investigado, nao reproduzido", nao "pendente").

### M7 — Servicos: regras e midia ✅ mergeado

- Commit `1225024`, PR #23, mergeado.
- Bloqueio (nao so alerta — decisao confirmada com o Paulo) de servico para clientes
  menores em tipos de servico que exigem verificacao de idade (F4, migration 0027
  manual, `requires_age_verification` em `service_types`, so habilitavel via PATCH
  owner-only, nao na criacao inline de tipo). Idade calculada por diferenca real de data
  (mes/dia).
- Ate 3 fotos de 300KB por servico via bucket privado `service-media` (F8).
- Nome amigavel preservado no download de anexo do cliente via `Content-Disposition`,
  fechando o ultimo gap do F7.

### M8 — Exportacao de dados ✅ mergeado

- Commit `370f6db`, PR #25, mergeado.
- "Exportar dados" (A5) com CSV (delimitador configuravel) ou Excel (.xlsx),
  substituindo o antigo botao fixo de CSV.

### M9 — Tour de onboarding ✅ mergeado

- Commit `2960c53`, PR #26, mergeado.
- Tour interativo auto-exibido no primeiro login (flag persistida no backend,
  `users.onboarding_completed_at` — decisao do Paulo: backend, nao localStorage) +
  botao de replay em "Minha Conta" (decisao do Paulo: nao em Configuracoes da org) (F9).

### M10 — Ficha de anamnese (F10) ✅ mergeado, em 3 PRs

Dividido em 3 fatias (decisao do Paulo, apos pesquisa mostrar que "complexa" no roadmap
subestimava o escopo real):

- **M10a** (commit `ceed41a`, PR #27): construtor de formulario (perguntas
  texto/sim-nao) por tipo de servico + versionamento imutavel (`anamnesis_forms` +
  `anamnesis_form_versions`, 1 form por tipo de servico, N versoes, RLS sem
  UPDATE/DELETE — imutabilidade estrutural). So owner cria/edita; qualquer membro le.
- **M10b** (commit `d7fe461`, PR #28): link publico sem login + submissao da resposta
  pelo cliente (primeiro endpoint de escrita publica do app). Gatilho do envio e acao
  MANUAL do owner/funcionario (decisao do Paulo — nao automatico via agenda nem via
  lancamento de servico). Resposta autocontida (snapshot das perguntas no envio).
  `services.anamnesis_response_id` permite vincular manualmente uma resposta submetida
  a um lancamento financeiro.
- **M10c** (commit `2af65df`, PR #29): assinatura eletronica DIY (canvas + PDF de
  evidencia + hash SHA-256 + e-mail de copia best-effort). Pesquisa juridica concluida:
  assinatura eletronica simples (nao ICP-Brasil) e valida no Brasil para este tipo de
  documento (jurisprudencia STJ 2024-2026); gov.br Assinador inviavel (API restrita a
  orgaos publicos); DIY escolhido sobre ClickSign/DocuSign (mesmo nivel juridico, custo
  zero).
- **F10 assim confirma todos os sub-requisitos originais**: perguntas texto/sim-nao ✅,
  versionamento ✅, assinatura digital ✅, envio de link publico sem login ✅, e-mail
  (Resend) + botao copiar link ✅, sem WhatsApp no MVP ✅ (conforme decisao ja registrada
  em "Decisoes tomadas").

### M11 — Stripe: trial + assinatura — CONCLUIDO (fatiado em M11a/M11b/M11c)

Ultimo item do backlog original — **encerra o backlog desta reuniao**. Seguiu o modelo
real do Larmony (ADR-0026/0029 la, [`.memory/adr/0016-billing-stripe-assinatura.md`](../../.memory/adr/0016-billing-stripe-assinatura.md)
aqui), nao o texto literal do item original (trial via cupom 100%): trial nativo do
Stripe Checkout, comp/isencao 100% local, desconto parcial via Coupon API.

- **M11a** — catalogo de planos + checkout hospedado + webhook publico idempotente +
  `EntitlementsService` read-only. Migration `0033` (7 colunas novas em `subscriptions`
  + `stripe_webhook_events`/`billing_plans`/`billing_invoice_events`, RLS sem policy).
- **M11b** — trial self-serve (60 dias, cartao obrigatorio, write-once) + Stripe Billing
  Portal + `ActiveSubscriptionGuard` (nao-global) gateando escrita em
  cashier/services/customers/materials/calendar/anamnesis + frontend da pagina de
  assinatura.
- **M11c** — admin: conceder/revogar isencao, aplicar/remover desconto, listar faturas
  (`admin/orgs/:orgId/subscription/*`, `PlatformAdminGuard`) + cron
  (`billing-reconciliation`, `billing-expiry-sweep`) + painel `/admin/billing` real +
  runbook de teste local ([`docs/billing-local-testing.md`](../billing-local-testing.md)).

Validado com Stripe CLI real em modo teste (checkout, trial, portal, webhook,
comp/desconto, cron) em todas as 3 fatias — nao so unit tests com mocks. Pendencia
conhecida: o plano `standard` sobe com `priceCents=0` (placeholder) — preencher o valor
real exige rotacionar o `lookup_key` do Price no Stripe antes de qualquer ambiente real
(precos sao imutaveis no Stripe).

---

## Infra de testes — guia rapido para quem continuar

```bash
pnpm --filter backend test      # Jest — specs em apps/backend/src/**/*.spec.ts
pnpm --filter frontend test     # Vitest — specs em apps/frontend/src/**/*.{spec,test}.{ts,tsx}
pnpm check-types                # tsc --noEmit em todos os packages (turbo, cacheado)
pnpm lint                       # eslint --max-warnings 0 em todos os packages
pnpm --filter backend build     # nest build
pnpm --filter frontend build    # next build — VER FALHA CONHECIDA ABAIXO
```

**RESOLVIDO em 2026-07-15 (durante M2)**: a falha `pnpm --filter frontend build` (e
`next dev`) com `The route /_betterstack/... rewrites urls outside of the basePath...
Error: Invalid rewrites found` **nao era falta de env var** — `.env.local` sempre teve
`NEXT_PUBLIC_BETTER_STACK_*` validos. Causa real: Next 16 usa Turbopack por padrao
quando nenhuma flag de bundler e passada, e o Turbopack tem um bug de validacao para o
rewrite externo assincrono que o `@logtail/next` (`withBetterStack`) gera com
`basePath: false` — rejeita uma URL `https://` sintaticamente valida. Fix aplicado:
`apps/frontend/package.json` agora forca `--webpack` nos scripts `dev`/`build`/`dev:reset`
ate o bug do Turbopack ser corrigido a montante. Detalhes em `env_turbopack_hydration` na
memoria do Claude. Nenhuma milestone deste backlog precisa mais tratar esse erro como
preexistente — se reaparecer, e regressao.

Ao adicionar testes novos: sempre fakes/mocks em memoria, nunca banco real (backend) e
nunca `@repo/*` nos testes de frontend (linking quebrado neste ambiente, ver ADR
`env_pnpm_junction_corruption` na memoria do Claude se for investigar a fundo).

---

## Inventario completo de itens

### Bugs

| # | Item | Severidade | Modulos | Ref | Status |
|---|---|---|---|---|---|
| B1 | **Permissoes acopladas**: funcionario nao seleciona cliente/material no lancamento de servico sem ter a flag de gerenciamento do modulo. | **Critica** | auth/permissions, services, customers, materials | Part II 7:16–11:52 | ✅ **M1 concluido, mergeado** |
| B2 | Servico sem material vinculado **falha silenciosamente** (nao salva e nao mostra erro no formulario). | Alta | services (frontend form) | Part I 45:32 | ✅ **M2 concluido, mergeado** |
| B3 | Agenda **nao navega para meses futuros**. | Media | calendar | Part I 31:04 | 🔍 **investigado no M6, NAO reproduzido** (ao vivo, browser + API) — sem mudanca de codigo |
| B4 | Telefone aceita qualquer coisa (ex.: 9999999...). Falta validacao de plausibilidade com country code. | Media | customers | Part I 2:41 | ✅ **M2 concluido, mergeado** |
| B5 | Cliente duplicado por **e-mail** e permitido (com "deseja prosseguir?"). Deve bloquear sem opcao de prosseguir; nome pode repetir. | Media | customers | Part I 14:21 | ✅ **M2 concluido, mergeado** (dedup automatico via migration) |
| B6 | E possivel **lancar servico com data futura**. Bloquear. | Media | services | Part I 44:52 | ✅ **M2 concluido, mergeado** |
| B7 | Metodo de pagamento **"Creditos"** aparece no lancamento — sobra de codigo do cashback descartado. Remover. | Baixa | cashier | Part II 2:54 | ✅ **M2 concluido, mergeado** |

### Alteracoes / restricoes (comportamento existente)

| # | Item | Modulos | Ref | Status |
|---|---|---|---|---|
| A1 | **Transferencia**: remover metodos de pagamento (Pix, cartao etc.); so caixa de origem → caixa de destino. | cashier | Part II 1:11–2:49 | ✅ **M2 concluido, mergeado** |
| A2 | **Ocultar do funcionario** valores de custo/reposicao de estoque no dashboard (e qualquer metrica de valor restrita a admin). | overview, materials | Part I 34:49; Part II 7:16 | ✅ **M3 concluido, mergeado** — inclui o finding do M1 sobre `costPerUnit` em materials list (fechado) |
| A3 | Remover opcao **"Excluir conta" para funcionarios**. Para admins: pesquisar LGPD antes de decidir (anonimizacao vs exclusao; efeito cascata em assinatura/organizacao). | auth, settings | Part II 4:44–6:44 | ✅ **parte funcionario concluida no M3, mergeada**; parte admin **ainda bloqueada por pesquisa LGPD** (nao resolvida) |
| A4 | Tornar **material obrigatorio** no lancamento de servico, com mensagem de erro clara (par do B2). | services | Part I 45:59 | ✅ **M2 concluido, mergeado** |
| A5 | **Exportacao**: renomear "CSV" para "Exportar dados" com opcoes CSV (delimitador configuravel) ou Excel (.xlsx). | todas as listagens com export | Part I 16:01–24:56 | ✅ **M8 concluido, mergeado** |
| A6 | Campos obrigatorios no cadastro de cliente: **e-mail, endereco, data de nascimento**. Decisao: **fixo para todas as orgs** (nao configuravel). | customers | Part I 4:24–7:20 | ✅ **M4 concluido, mergeado** |

### Novas features

| # | Item | Tamanho | Modulos | Ref | Status |
|---|---|---|---|---|---|
| F1 | **ViaCEP** no endereco: CEP puxa endereco; separar numero do logradouro; fallback aberto para nao-BR. | M | customers | Part I 5:00–6:40 | ✅ **M4 concluido, mergeado** |
| F2 | **Filtros de cliente**: aniversariantes do mes (range de data de nascimento) + cidade/estado. Decisao: melhorar o filtro, NAO criar aba propria. | M | customers | Part I 25:13–28:12 | ✅ **M4 concluido, mergeado** |
| F3 | **Pagina de detalhe do cliente** (double-click na lista): historico de transacoes, servicos, cadastro. Feature existia no roadmap V1 e foi cortada; restaurar. | M | customers | Part I 15:14–16:01 | ✅ **M4 concluido, mergeado** |
| F4 | **Flag 18+ por tipo de servico**: tatuagem exige revisao de menoridade no lancamento (alerta/bloqueio se cliente <18 na data); body piercing permite. | M | services | Part I 9:36–11:46 | ✅ **M7 concluido, mergeado** — decisao final: BLOQUEIA (nao so alerta) |
| F5 | **Categorias de saida do caixa gerenciaveis**: seed padrao na criacao da org (Conta, Funcionario, Material, Reforma, Servico, Transferencia, Outros); admin cria novas (ex.: Estorno); "Outros" fixo. | M | cashier | Part I 48:28; Part II 0:13–4:44 | ✅ **M5 concluido, mergeado (PR #20)** |
| F6 | **Eventos de agenda compartilhados**: evento visivel para toda a org + lista de presenca (funcionario marca "vou/nao vou"). Evento pessoal continua privado (funcionario ve so o seu; admin ve todos). Valor da sessao: fica na descricao (sem campo novo). | M | calendar | Part I 28:12–32:20 | ✅ **M6 concluido, mergeado (PR #22)** |
| F7 | **Upload de arquivos (revisao)**: permitir renomear pelo sistema; nome interno unico no storage; preservar nome amigavel no download. Caso de uso: multiplos anexos por cliente (anamnese + emancipacao). | M | customers/storage | Part I 11:57–14:18 | ✅ **M7 concluido, mergeado** — ultimo gap fechado (nome amigavel no download via `Content-Disposition`) |
| F8 | **Fotos no servico**: ate 3 imagens, max 300KB cada (limite rigido para custo de storage). | M | services/storage | Part I 46:19–48:18 | ✅ **M7 concluido, mergeado** |
| F9 | **Tour de onboarding**: auto-exibir no primeiro login; replay em Configuracoes. Substitui manual de usuario estatico. | M/G | frontend (transversal) | Part II 11:52–14:00 | ✅ **M9 concluido, mergeado (PR #26)** — replay em "Minha Conta", nao em Configuracoes da org |
| F10 | **Construtor de ficha de anamnese**: perguntas texto e sim/nao; ficha por tipo de servico; **versionamento** (servico referencia a versao usada); **assinatura digital**; envio de link publico (preenchimento sem login) via e-mail + botao copiar link (decisao: sem WhatsApp API no MVP). | **G** | novo modulo | Part I 36:29–44:49 | ✅ **M10 concluido, mergeado em 3 PRs** (M10a PR #27, M10b PR #28, M10c PR #29) |
| F11 | **Trial links + assinatura via Stripe**: link de trial de 2 meses, assinatura com desconto para pilotos, tudo gerenciado no Stripe e espelhado no sistema (trials/descontos/isencoes = cupons; isencao = cupom de 100%; assinatura sempre criada no Stripe). Basear na implementacao existente do projeto Larmony. | **G** | novo modulo (billing) | Part II 21:32–25:24 | ✅ **M11 concluido, mergeado (M11a/b/c)** — modelo real do Larmony (trial nativo + comp local + cupom so pra desconto), nao o texto literal do item |

### Alinhamentos / decisoes de produto (documentar, sem codigo)

| # | Decisao | Ref |
|---|---|---|
| D1 | **Nicho**: foco em estudios de tatuagem, tatuadores e body piercers. Nao generalizar para barbearias etc. | Part I 7:20–9:36 |
| D2 | **Nome**: IOS — Assessoria Inc. Operational System. Logo vetorizado + paleta chegam do Ruan/Joao Pedro (prometido ate 14/07 — verificar com o Paulo se ja chegou antes de qualquer trabalho de rebranding). | Part II 14:29–17:42 |
| D3 | **Cashback/creditos**: descartado do core; se voltar, sera via feature flag por organizacao (super admin habilita). Relacionado ao B7 (remover metodo "Creditos" morto). | Part I 18:30 |
| D4 | Configuracoes permanecem centralizadas na aba Configuracoes (nao mover para dentro dos modulos) — facilita treinamento. | Part I 34:21–34:49 |
| D5 | Multi-organizacao guest (dono de um estudio como funcionario de outro) e cenario suportado e desejado. | Part II 8:40–9:45 |
| D6 | Cronograma GTM: julho = refinamento + pagamento; ago–set = free trial (3 estudios ja confirmados); out = lancamento publico. | Part II 21:32–25:59 |

### Visao de futuro (fora de escopo agora — so registrar, NAO planejar milestone)

- **Perfil Distribuidor**: plataforma propria para distribuidora parceira (parcerias,
  descontos, quem comprou). Horizonte ~2 meses; reuniao dedicada com o distribuidor
  antes de qualquer design.
- **Super Admin central**: evoluir admin atual para painel unico de todos os produtos da
  Assessoria Inc. (IOS, audiovisual etc.).
- **Agenda do audiovisual**: provavelmente outro produto; conversa futura.
- **Mensagens pos-atendimento / remarketing**: campanhas de disparo; conversa futura.
- **Dominio e e-mail do IOS**: tarefa de infra (Paulo), depende do branding.

---

## Proposta de milestones (plano completo)

Ordenados do menor/mais urgente para o maior. Cada milestone = uma branch
`features/<slug>` (ou `fix/<slug>`), PR para `development` (aberto/mergeado pelo
Paulo), bump de versao minor nos dois apps, testes obrigatorios.

| Milestone | Conteudo | Risco (skill) | Status |
|---|---|---|---|
| **M0 — Infra de testes** | Jest backend + Vitest frontend + task turbo. | intermediaria | ✅ concluido, mergeado |
| **M1 — Fix critico de permissoes** (B1) | Desacoplar flag de modulo da selecao de entidades no lancamento de servico. | **complexa** (auth/RLS) | ✅ concluido, mergeado |
| **M2 — Restricoes e validacoes rapidas** (B2, B4, B5, B6, B7, A1, A4) | Validacao de telefone, e-mail unico por org (sem "prosseguir mesmo assim"), bloqueio de data futura em servico, material obrigatorio + erro visivel no form, transferencia simplificada (so origem→destino), remover metodo "Creditos". | complexa (toca caixa e possivel unique constraint) | ✅ concluido, mergeado (`f6d5733`) |
| **M3 — Visibilidade por papel** (A2, A3-parte-funcionario) | Ocultar metricas de valor/custo do funcionario no dashboard/estoque (inclui fechar o finding do M1 sobre `costPerUnit` em materials); remover "Excluir conta" de funcionario. LGPD para admin fica pendente de pesquisa (nao bloqueia a parte funcionario). | intermediaria | ✅ concluido, mergeado (`1add473`) — LGPD admin (A3-admin) segue pendente |
| **M4 — Cadastro de cliente** (A6, F1, F2, F3) | Obrigatoriedade de campos (fixo p/ todas as orgs), ViaCEP + numero separado do logradouro + fallback nao-BR, filtros aniversariantes do mes + cidade/estado, pagina de detalhe do cliente (double-click) com historico. | complexa (migration em customers) + database-guardian | ✅ concluido, mergeado (`a1db104`) |
| **M5 — Caixa: categorias gerenciaveis** (F5) | CRUD de categorias por org + seed padrao na criacao da org + migracao de dados existentes. | **complexa** (caixa/dinheiro, migration) + database-guardian | ✅ concluido, mergeado (`b74546a`, PR #20) |
| **M6 — Agenda** (B3, F6) | Navegacao para meses futuros; eventos compartilhados + presenca (RSVP); eventos pessoais continuam privados. | intermediaria | ✅ concluido, mergeado (`b766b4b`, PR #22) — B3 investigado e nao reproduzido |
| **M7 — Servicos: regras e midia** (F4, F8, F7) | Flag 18+ por tipo de servico, upload de fotos do servico (3 imgs, 300KB cada), revisao do upload de arquivos do cliente (renomear, nome interno unico, nome amigavel no download). | complexa (migration + storage) + database-guardian | ✅ concluido, mergeado (`1225024`, PR #23) |
| **M8 — Exportacao de dados** (A5) | "Exportar dados": CSV com delimitador configuravel + Excel (.xlsx). | intermediaria | ✅ concluido, mergeado (`370f6db`, PR #25) |
| **M9 — Onboarding tour** (F9) | Tour interativo, primeira entrada + replay em config. Mobile-first. | intermediaria (so frontend) | ✅ concluido, mergeado (`2960c53`, PR #26) |
| **M10 — Ficha de anamnese** (F10) | Form builder (texto/sim-nao) por tipo de servico, versionado (servico referencia versao imutavel), assinatura digital, link publico sem login, envio por e-mail (Resend) + copiar link. | **complexa** (novo modulo, contrato publico) + database-guardian | ✅ concluido, mergeado em 3 PRs (M10a #27, M10b #28, M10c #29) |
| **M11 — Stripe: trial + assinatura** (F11) | Basear no Larmony. Assinatura sempre criada no Stripe; trials/descontos/isencoes vem do Stripe (isencao = cupom 100%); links de trial para pilotos de 2 meses. Executar por ultimo. | **complexa** (dinheiro, integracao externa) + database-guardian | ✅ **concluido, mergeado (M11a/b/c)** — encerra o backlog original desta reuniao |

---

## Decisoes tomadas (Paulo, 2026-07-15)

1. **Testes**: espelhar o Larmony — **Jest no backend** (ts-jest, specs em
   `src/**/*.spec.ts`) e **Vitest no frontend** (Larmony nao tem testes de frontend,
   entao assumimos Vitest conforme combinado). ✅ Implementado no M0.
2. **Campos obrigatorios do cliente** (A6): fixos para todas as organizacoes, nao
   configuraveis por org.
3. **Anamnese** (F10): envio de link por e-mail (Resend, ja integrado no modulo `mail`)
   + botao "copiar link". Sem integracao WhatsApp no MVP.
4. **Billing (M11)**: provedor e **Stripe**, baseado na implementacao existente no
   Larmony (`C:\Users\Paulo\Documents\Repos\Pessoal\larmony` — checar
   `.memory/adr/` de la para a decisao original, e o modulo de billing do backend la
   como referencia de implementacao). Tudo gerenciado no Stripe e espelhado no sistema:
   trials, descontos e isencoes (= cupom de 100%) vem do Stripe; assinatura sempre
   criada no Stripe. Executado por ultimo, apos M0–M10.

## Pendencias (bloqueiam so a parte especifica, nao o milestone inteiro)

- **LGPD (A3-admin)**: pesquisa de conformidade para exclusao/anonimizacao de conta de
  admin — segue **NAO resolvida**. Nao ha nenhuma mencao de LGPD/anonimizacao em
  `.memory/domain-rules.md` (so uma nota nao relacionada sobre CPF em texto puro no
  M10c). Continua bloqueada aguardando pesquisa do Paulo; a parte funcionario do A3 ja
  foi resolvida no M3 e nao depende disso.
- **Logo vetorizado + paleta do IOS** (Ruan/Joao Pedro, prometido ate 14/07) — bloqueia
  rebranding visual, nao bloqueia nenhum milestone tecnico deste backlog. Assunto de
  branding, fora da alcada de verificacao tecnica deste documento — nao verificado
  nesta atualizacao.
- ~~**M2 — pergunta de dados em aberto** sobre deduplicacao de e-mail~~ — **RESOLVIDA**:
  o M2 (commit `f6d5733`) implementou dedup automatico via migration + constraint,
  bloqueando cadastros novos duplicados sem opcao de "prosseguir mesmo assim" (ver B5 e
  secao "M2" acima).

## Pendencias de repositorio (nao relacionadas ao codigo, mas relevantes)

- Os arquivos `meeting-07-10-26.md` e `meeting-07-10-26-summary.md` na raiz do repo
  seguem **untracked** — nao foram commitados por poderem conter dado pessoal/transcricao
  bruta. Perguntar ao Paulo se quer versiona-los (sugestao: mover para
  `docs/meetings/2026-07-10/` antes de commitar) ou manter fora do git
  permanentemente (adicionar ao `.gitignore` nesse caso).
