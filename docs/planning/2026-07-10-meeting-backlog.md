# Backlog da reuniao de 10/07/2026 — revisao do MVP (IOS)

> Fonte: `meeting-07-10-26.md` (Parte I, 51 min) e `meeting-07-10-26-summary.md`
> (Parte II, 32 min) — arquivos **untracked** na raiz do repo (nao commitados; podem
> conter dado pessoal, ver "Pendencias de repositorio" no final).
> Participantes: Paulo (dev), Ruan (stakeholder).
>
> **STATUS DESTE DOCUMENTO: handoff ativo.** M0 e M1 estao implementados, testados,
> revisados e commitados (nao mergeados/pushed). M2–M11 estao especificados abaixo mas
> NAO iniciados. Este arquivo e a fonte de verdade para retomar — leia-o inteiro antes
> de tocar em qualquer milestone.

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
2. **Branches empilhadas**: `fix/m1-permissions-decoupling` esta em cima de
   `features/m0-test-infra`, que esta em cima de `development`. Nenhuma foi mergeada
   nem pushed ainda (regra do projeto: sem push, sem PR aberto por mim — so o Paulo).
   Ao iniciar M2, decida com o Paulo se cria `features/m2-validations` a partir de
   `fix/m1-permissions-decoupling` (empilhada, mantendo o fix visivel) ou aguarda merge
   antes. Recomendo perguntar antes de escolher — nao decida sozinho, ha risco de
   conflito se M1 ainda mudar.
3. **Validacao padrao** (nao ha suite e2e): `pnpm check-types` + `pnpm lint` +
   `pnpm --filter <app> test` + build direcionado. Ver "Infra de testes" abaixo para
   detalhes e a falha preexistente conhecida no build do frontend.
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

### M0 — Infra de testes ✅ commitado

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

### M1 — Fix critico: desacoplar permissoes (B1) ✅ commitado

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
- **Findings do reviewer que viraram pendencia para M3** (NAO resolvidos ainda, ja
  registrados na tabela de milestones abaixo):
  - `GET /orgs/:orgId/materials` agora e acessivel a qualquer membro habilitado e
    retorna `costPerUnit`, `stockQuantity`, `minimumQuantity` + aceita filtros
    `minCost`/`maxCost` — funcionario sem a flag `stock` ve custo de material. Dentro do
    requisito do B1 (leitura liberada), mas amplia a exposicao antes do M3 (que vai
    ocultar metricas de valor do funcionario). **M3 deve decidir**: omitir `costPerUnit`
    para quem nao tem `stock`, ou criar payload de selecao enxuto (`id`, `name`,
    `categoryId`, `archivedAt`).
  - `GET /orgs/:orgId/customers` (`list()`) retorna a entidade completa (endereco,
    `birthDate`, `notes`) para qualquer membro — mais PII do que a selecao no form de
    servico precisa. Registrado como nota de baixa severidade, sem acao obrigatoria,
    mas vale revisitar junto com M3/M4.
- **Nao mergeado ainda** — aguardando revisao/merge do Paulo.

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
| B1 | **Permissoes acopladas**: funcionario nao seleciona cliente/material no lancamento de servico sem ter a flag de gerenciamento do modulo. | **Critica** | auth/permissions, services, customers, materials | Part II 7:16–11:52 | ✅ **M1 concluido** |
| B2 | Servico sem material vinculado **falha silenciosamente** (nao salva e nao mostra erro no formulario). | Alta | services (frontend form) | Part I 45:32 | pendente (M2) |
| B3 | Agenda **nao navega para meses futuros**. | Media | calendar | Part I 31:04 | pendente (M6) |
| B4 | Telefone aceita qualquer coisa (ex.: 9999999...). Falta validacao de plausibilidade com country code. | Media | customers | Part I 2:41 | pendente (M2) |
| B5 | Cliente duplicado por **e-mail** e permitido (com "deseja prosseguir?"). Deve bloquear sem opcao de prosseguir; nome pode repetir. | Media | customers | Part I 14:21 | pendente (M2) |
| B6 | E possivel **lancar servico com data futura**. Bloquear. | Media | services | Part I 44:52 | pendente (M2) |
| B7 | Metodo de pagamento **"Creditos"** aparece no lancamento — sobra de codigo do cashback descartado. Remover. | Baixa | cashier | Part II 2:54 | pendente (M2) |

### Alteracoes / restricoes (comportamento existente)

| # | Item | Modulos | Ref | Status |
|---|---|---|---|---|
| A1 | **Transferencia**: remover metodos de pagamento (Pix, cartao etc.); so caixa de origem → caixa de destino. | cashier | Part II 1:11–2:49 | pendente (M2) |
| A2 | **Ocultar do funcionario** valores de custo/reposicao de estoque no dashboard (e qualquer metrica de valor restrita a admin). | overview, materials | Part I 34:49; Part II 7:16 | pendente (M3) — **inclui o finding do M1 sobre `costPerUnit` em materials list** |
| A3 | Remover opcao **"Excluir conta" para funcionarios**. Para admins: pesquisar LGPD antes de decidir (anonimizacao vs exclusao; efeito cascata em assinatura/organizacao). | auth, settings | Part II 4:44–6:44 | pendente (M3) — parte funcionario e direta; parte admin **bloqueada por pesquisa LGPD** |
| A4 | Tornar **material obrigatorio** no lancamento de servico, com mensagem de erro clara (par do B2). | services | Part I 45:59 | pendente (M2) |
| A5 | **Exportacao**: renomear "CSV" para "Exportar dados" com opcoes CSV (delimitador configuravel) ou Excel (.xlsx). | todas as listagens com export | Part I 16:01–24:56 | pendente (M8) |
| A6 | Campos obrigatorios no cadastro de cliente: **e-mail, endereco, data de nascimento**. Decisao: **fixo para todas as orgs** (nao configuravel). | customers | Part I 4:24–7:20 | pendente (M4) |

### Novas features

| # | Item | Tamanho | Modulos | Ref | Status |
|---|---|---|---|---|---|
| F1 | **ViaCEP** no endereco: CEP puxa endereco; separar numero do logradouro; fallback aberto para nao-BR. | M | customers | Part I 5:00–6:40 | pendente (M4) |
| F2 | **Filtros de cliente**: aniversariantes do mes (range de data de nascimento) + cidade/estado. Decisao: melhorar o filtro, NAO criar aba propria. | M | customers | Part I 25:13–28:12 | pendente (M4) |
| F3 | **Pagina de detalhe do cliente** (double-click na lista): historico de transacoes, servicos, cadastro. Feature existia no roadmap V1 e foi cortada; restaurar. | M | customers | Part I 15:14–16:01 | pendente (M4) |
| F4 | **Flag 18+ por tipo de servico**: tatuagem exige revisao de menoridade no lancamento (alerta/bloqueio se cliente <18 na data); body piercing permite. | M | services | Part I 9:36–11:46 | pendente (M7) |
| F5 | **Categorias de saida do caixa gerenciaveis**: seed padrao na criacao da org (Conta, Funcionario, Material, Reforma, Servico, Transferencia, Outros); admin cria novas (ex.: Estorno); "Outros" fixo. | M | cashier | Part I 48:28; Part II 0:13–4:44 | pendente (M5) |
| F6 | **Eventos de agenda compartilhados**: evento visivel para toda a org + lista de presenca (funcionario marca "vou/nao vou"). Evento pessoal continua privado (funcionario ve so o seu; admin ve todos). Valor da sessao: fica na descricao (sem campo novo). | M | calendar | Part I 28:12–32:20 | pendente (M6) |
| F7 | **Upload de arquivos (revisao)**: permitir renomear pelo sistema; nome interno unico no storage; preservar nome amigavel no download. Caso de uso: multiplos anexos por cliente (anamnese + emancipacao). | M | customers/storage | Part I 11:57–14:18 | pendente (M7) |
| F8 | **Fotos no servico**: ate 3 imagens, max 300KB cada (limite rigido para custo de storage). | M | services/storage | Part I 46:19–48:18 | pendente (M7) |
| F9 | **Tour de onboarding**: auto-exibir no primeiro login; replay em Configuracoes. Substitui manual de usuario estatico. | M/G | frontend (transversal) | Part II 11:52–14:00 | pendente (M9) |
| F10 | **Construtor de ficha de anamnese**: perguntas texto e sim/nao; ficha por tipo de servico; **versionamento** (servico referencia a versao usada); **assinatura digital**; envio de link publico (preenchimento sem login) via e-mail + botao copiar link (decisao: sem WhatsApp API no MVP). | **G** | novo modulo | Part I 36:29–44:49 | pendente (M10) |
| F11 | **Trial links + assinatura via Stripe**: link de trial de 2 meses, assinatura com desconto para pilotos, tudo gerenciado no Stripe e espelhado no sistema (trials/descontos/isencoes = cupons; isencao = cupom de 100%; assinatura sempre criada no Stripe). Basear na implementacao existente do projeto Larmony. | **G** | novo modulo (billing) | Part II 21:32–25:24 | pendente (M11 — **por ultimo**) |

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
| **M0 — Infra de testes** | Jest backend + Vitest frontend + task turbo. | intermediaria | ✅ concluido |
| **M1 — Fix critico de permissoes** (B1) | Desacoplar flag de modulo da selecao de entidades no lancamento de servico. | **complexa** (auth/RLS) | ✅ concluido |
| **M2 — Restricoes e validacoes rapidas** (B2, B4, B5, B6, B7, A1, A4) | Validacao de telefone, e-mail unico por org (sem "prosseguir mesmo assim"), bloqueio de data futura em servico, material obrigatorio + erro visivel no form, transferencia simplificada (so origem→destino), remover metodo "Creditos". | complexa (toca caixa e possivel unique constraint) | **proximo — nao iniciado** |
| **M3 — Visibilidade por papel** (A2, A3-parte-funcionario) | Ocultar metricas de valor/custo do funcionario no dashboard/estoque (inclui fechar o finding do M1 sobre `costPerUnit` em materials); remover "Excluir conta" de funcionario. LGPD para admin fica pendente de pesquisa (nao bloqueia a parte funcionario). | intermediaria | nao iniciado |
| **M4 — Cadastro de cliente** (A6, F1, F2, F3) | Obrigatoriedade de campos (fixo p/ todas as orgs), ViaCEP + numero separado do logradouro + fallback nao-BR, filtros aniversariantes do mes + cidade/estado, pagina de detalhe do cliente (double-click) com historico. | complexa (migration em customers) + database-guardian | nao iniciado |
| **M5 — Caixa: categorias gerenciaveis** (F5) | CRUD de categorias por org + seed padrao na criacao da org + migracao de dados existentes. | **complexa** (caixa/dinheiro, migration) + database-guardian | nao iniciado |
| **M6 — Agenda** (B3, F6) | Navegacao para meses futuros; eventos compartilhados + presenca (RSVP); eventos pessoais continuam privados. | intermediaria | nao iniciado |
| **M7 — Servicos: regras e midia** (F4, F8, F7) | Flag 18+ por tipo de servico, upload de fotos do servico (3 imgs, 300KB cada), revisao do upload de arquivos do cliente (renomear, nome interno unico, nome amigavel no download). | complexa (migration + storage) + database-guardian | nao iniciado |
| **M8 — Exportacao de dados** (A5) | "Exportar dados": CSV com delimitador configuravel + Excel (.xlsx). | intermediaria | nao iniciado |
| **M9 — Onboarding tour** (F9) | Tour interativo, primeira entrada + replay em config. Mobile-first. | intermediaria (so frontend) | nao iniciado |
| **M10 — Ficha de anamnese** (F10) | Form builder (texto/sim-nao) por tipo de servico, versionado (servico referencia versao imutavel), assinatura digital, link publico sem login, envio por e-mail (Resend) + copiar link. | **complexa** (novo modulo, contrato publico) + database-guardian | nao iniciado |
| **M11 — Stripe: trial + assinatura** (F11) | Basear no Larmony. Assinatura sempre criada no Stripe; trials/descontos/isencoes vem do Stripe (isencao = cupom 100%); links de trial para pilotos de 2 meses. Executar por ultimo. | **complexa** (dinheiro, integracao externa) + database-guardian | nao iniciado — **provedor ja decidido: Stripe** |

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
  admin — bloqueia apenas a parte de admin do M3 (a remocao do botao para funcionario
  segue sem bloqueio). Perguntar ao Paulo se ja pesquisou antes de iniciar essa fatia.
- **Logo vetorizado + paleta do IOS** (Ruan/Joao Pedro, prometido ate 14/07) — bloqueia
  rebranding visual, nao bloqueia nenhum milestone tecnico deste backlog.
- **M2 — pergunta de dados em aberto** (levantada ao planejar mas ainda nao respondida):
  o e-mail unico por org (B5) provavelmente exige unique index/constraint. Se ja
  existirem clientes duplicados por e-mail em staging/producao, e preciso decidir com o
  Paulo: deduplicar automaticamente, bloquear so cadastros novos (constraint sem
  backfill), ou tratar manualmente antes da migration. **Verificar isso ANTES de
  escrever a migration do M2** — rode uma query de contagem de duplicatas por
  `(organization_id, email)` em customers assim que iniciar.

## Pendencias de repositorio (nao relacionadas ao codigo, mas relevantes)

- Os arquivos `meeting-07-10-26.md` e `meeting-07-10-26-summary.md` na raiz do repo
  seguem **untracked** — nao foram commitados por poderem conter dado pessoal/transcricao
  bruta. Perguntar ao Paulo se quer versiona-los (sugestao: mover para
  `docs/meetings/2026-07-10/` antes de commitar) ou manter fora do git
  permanentemente (adicionar ao `.gitignore` nesse caso).
