# ADR-0024 — Billing multi-preço por intervalo, reconciliação Stripe→banco invertida, endpoint público + landing com ISR

**Status:** Aceito
**Data:** 2026-08-16

## Contexto

O ADR-0023 estabeleceu `billing_plans` (banco) como fonte de verdade do catálogo, com um
único preço fixo por plano (`amountCents`/`currency`/`interval`/`stripePriceId`/`lookupKey`
direto na tabela) e rotação via `RotateBillingPlanPriceUseCase` +
`POST /admin/billing/plans/sync` manual. Esta sessão reestruturou essa modelagem para
suportar **múltiplos intervalos de cobrança por plano** (mensal/semestral/anual, cada um com
seu próprio preço editável) e adicionou uma superfície pública de preços para a landing page.
As decisões abaixo não são óbvias e são fáceis de reintroduzir errado numa sessão futura que
precise "editar o preço de um plano" ou "adicionar mais um intervalo".

## Decisão

1. **`billing_plans` vira só dados de produto; `billing_plan_prices` (migration `0048`) guarda
   N preços por plano, um por intervalo.** Colunas de preço legadas
   (`amount_cents`/`currency`/`interval`/`stripe_price_id`/`lookup_key`) **continuam existindo**
   em `billing_plans` — a migration `0048` é deliberadamente só EXPAND (cria a tabela nova +
   backfill preservando o `stripe_price_id` real já em produção). O comentário da migration
   menciona uma futura migration de CONTRACT (removeria as colunas legadas) como "0050", mas
   **quando ela roda não foi decidido nesta sessão** — é trabalho futuro, não uma migration
   agendada.

2. **Dois índices únicos parciais em `billing_plan_prices` (`WHERE active`), regra crítica para
   qualquer código que cria/promove uma linha para ativa:**
   - `(plan_id, interval) WHERE active` — só um preço vigente por (plano, intervalo).
   - `(lookup_key) WHERE active` — só a linha ativa "possui" a `lookup_key` (ela é
     transferível entre linhas via `transferLookupKey: true` do Stripe numa rotação).

   Preços antigos **nunca são apagados** quando um preço é rotacionado — só desativados via
   `IBillingPlanPriceRepository.deactivateById`, que limpa `active: false` **e**
   `lookup_key: null` numa operação só. **Qualquer fluxo que ativa uma nova linha para um
   (plano, intervalo) precisa desativar a linha antiga ANTES/JUNTO da nova** (mesma ordem:
   `deactivateById` primeiro), ou colide com os dois índices. `ReconcilePlanCatalogUseCase`
   (item 4) segue a mesma regra ao aposentar um preço arquivado/sumido no Stripe.

3. **`RotatePlanIntervalPriceUseCase` substitui `RotateBillingPlanPriceUseCase`** (deletado) —
   opera por (plano, intervalo) em vez de plano inteiro, e agora **migra automaticamente os
   assinantes elegíveis** para o novo Price via `MigrateSubscribersToPriceUseCase`
   (`stripe.subscriptions.update` com `proration_behavior: 'create_prorations'` e
   `idempotencyKey` determinística `${stripeSubscriptionId}:${newPriceId}` — protege retry
   contra rateio duplicado). Assinantes `past_due` e cortesias (`type: 'custom'`) **nunca** são
   migrados (filtro em `findMigratableByStripePriceId`, decisão de negócio). Falha de migração
   numa assinatura nunca aborta as demais — relatório por assinatura no retorno; a rotação em
   si já é irreversível quando a migração roda.
   **Sem transação de banco entre desativar a linha antiga e criar a nova**: se `create` falhar
   depois do `deactivateById` ter sucedido, há compensação manual (reativa a linha antiga)
   que **não é perfeita** (o `lookup_key` já migrou no lado Stripe via `transferLookupKey`, então
   a linha reativada fica com uma `lookup_key` local que o Stripe já não associa mais a ela) —
   aceito porque a alternativa (nenhuma linha ativa) derruba checkout sem caminho de recuperação
   pela UI. Decisão registrada de não introduzir um `ITransactionRunner` cross-repository só
   para este caso (o módulo `support` tem um, mas é port específico daquele módulo) — custo
   desproporcional para este PR, ver comentário em `RotatePlanIntervalPriceUseCase`.
   Mudança de moeda é rejeitada **antes** de falar com o Stripe se houver assinantes migráveis
   no preço atual (Stripe rejeita moeda diferente numa subscription existente).

4. **Duas filosofias de sincronização coexistem deliberadamente, direções opostas:**
   - `SyncPlanCatalogUseCase` (só no boot, via `PlanCatalogService.onModuleInit`) continua
     "banco manda" do ADR-0023: nunca sobrescreve preço divergente automaticamente — reporta
     `drift` por entrada. O use-case **pode lançar** `StripeCatalogSyncFailedException` numa
     falha de sync; `onModuleInit` captura e envia via
     `TelemetryService.captureException` (ADR-0023), então uma falha no boot nunca derruba a
     aplicação nem fica silenciosa.
   - `ReconcilePlanCatalogUseCase` (**novo**) roda via cron a cada tick de
     `POST /internal/cron/tick` mas é **self-throttled** a no máximo 1x/3 dias via claim
     atômico em `cron_job_state` (migration `0049`, `ICronJobStateRepository.claimRun`) — o
     cron do projeto só tem um tick fixo de */15min compartilhado por todos os jobs, sem
     agendamento individual por job. Aqui a direção é **invertida**: Stripe é a fonte de
     verdade final para nome/descrição/valor/moeda/status ativo, e a reconciliação
     **sobrescreve o banco local automaticamente** quando detecta divergência, com
     `TelemetryService.captureMessage` obrigatório em toda sobrescrita monetária (nunca
     silenciosa). Um Product sumido no Stripe **não** desativa o plano automaticamente (exige
     revisão humana); um Price arquivado/sumido no Stripe **é** desativado automaticamente
     localmente (via `deactivateById`, mesma regra do item 2).

   As duas convivem porque atendem propósitos diferentes: edição via admin (dia a dia) =
   banco manda, com espelhamento imediato pro Stripe na mesma operação; drift detectado no
   cron (evento raro, edição fora de banda no Dashboard) = Stripe manda, correção automática
   só quando há divergência real — não é uma rotina que reverte edições legítimas do admin.

5. **Sync manual removido**: `POST /admin/billing/plans/sync` e o botão "Sincronizar com
   Stripe" na UI foram deletados. `SyncPlanCatalogUseCase` continua existindo só
   internamente, chamado no boot.

6. **`GET /public/billing/plans`** (novo) — protegido por `PublicBillingFeatureFlagGuard`
   (env `PUBLIC_PRICING_ENABLED`, default `false`, responde **404** — não 503 — quando
   desligado, mesmo padrão de `PUBLIC_SUPPORT_FORM_ENABLED`, para não anunciar a existência da
   rota). Retorna só `{ key, name, description, prices: [{interval, amountCents, currency}] }`
   via `ListPublicBillingPlansUseCase` — nunca ids do Stripe nem metadata interna.

7. **Landing (`apps/frontend/src/pages/index.tsx`) é a primeira página do projeto usando
   `getStaticProps` com `revalidate` (ISR)**, fallback de 21600s (6h). Revalidação sob
   demanda via `pages/api/revalidate.ts`, autenticada por header `x-revalidate-secret`
   comparado a `REVALIDATE_SECRET` — **segredo dedicado, nunca o `CRON_SECRET`** (superfícies
   diferentes: um autentica o backend chamando o Next.js, o outro autentica o disparo do tick
   de cron). Disparada best-effort (nunca lança, nunca atrasa a resposta) por
   `FrontendRevalidationClient` a partir de `RotatePlanIntervalPriceUseCase` e
   `ReconcilePlanCatalogUseCase` quando algo muda. Só é seguro usar ISR sem stale cache entre
   réplicas porque o **ADR-0011 já estabelece `numReplicas=1` por serviço/ambiente** — não há
   necessidade de invalidar cache em múltiplas instâncias simultaneamente.

8. **`CurrencyInput`** (novo, `apps/frontend/src/shared/components/ui/currency-input.tsx`) —
   máscara monetária as-you-type em centavos inteiros, usado no admin de billing para editar
   preços. Segue a mesma estrutura de `phone-input.tsx`, o outro componente mascarado do
   projeto (referência de padrão para o próximo input mascarado que surgir).

## Consequências

- Novos use-cases em `modules/subscriptions/application/use-cases/`:
  `RotatePlanIntervalPriceUseCase`, `UpsertPlanIntervalPriceUseCase`,
  `SetPlanIntervalActiveUseCase`, `MigrateSubscribersToPriceUseCase`,
  `ReconcilePlanCatalogUseCase`, `ListPublicBillingPlansUseCase`. Deletados:
  `RotateBillingPlanPriceUseCase` (e seu spec).
- Novo repositório `IBillingPlanPriceRepository`/`BILLING_PLAN_PRICE_REPOSITORY`
  (`domain/billing-plan-price.repository.interface.ts`,
  `infrastructure/persistence/drizzle-billing-plan-price.repository.ts`).
- Nova tabela `billing_plan_prices` (migration `0048`) — mesmo padrão de RLS de
  `billing_plans`/`billing_coupons`: habilitado sem policy, acesso só via `DRIZZLE_ADMIN`.
- Nova tabela `cron_job_state` (migration `0049`) — mecanismo genérico reutilizável por
  qualquer job futuro que precise de intervalo próprio maior que o tick de */15min.
- `AdminBillingController`: `POST /admin/billing/plans/:key/prices/:interval` (rotação),
  `POST /admin/billing/plans/:key/prices` (upsert de novo intervalo),
  `PATCH /admin/billing/plans/:key/prices/:interval` (ativar/desativar intervalo sem
  rotacionar preço). `sync` removido.
- Novo `PublicBillingController` (`GET /public/billing/plans`) e
  `FrontendRevalidationClient` (`infrastructure/frontend-revalidation.client.ts`).

## Alternativas rejeitadas

- **Transação de banco cobrindo `deactivateById` + `create` na rotação**: rejeitada por custo
  desproporcional (exigiria expor overloads transacionais no repositório ou importar o
  `ITransactionRunner` de outro módulo) frente ao volume esperado da operação; compensação
  manual best-effort aceita como suficiente.
- **Migrar `contract` das colunas legadas de `billing_plans` já nesta sessão**: rejeitada —
  esperar estabilidade em produção antes de remover as colunas antigas, mesmo com backfill já
  feito.
- **Cron individual por job (agendamento próprio) em vez de self-throttling via
  `cron_job_state`**: rejeitada — o projeto só tem um tick compartilhado de */15min; criar
  infraestrutura de agendamento individual seria desproporcional para um único job de 3 dias.
- **Reusar `CRON_SECRET` para autenticar a revalidação sob demanda**: rejeitada — são
  superfícies de autenticação diferentes (cron tick vs. revalidação Next.js), tratadas como
  segredos independentes por padrão de segurança.

## Relacionado

- ADR-0023 (catálogo de billing, imutabilidade Price/Coupon) — parcialmente superseded por
  este ADR na parte de modelagem single-price e do endpoint de sync manual; a parte de
  imutabilidade de Price/Coupon continua vigente e não é alterada aqui.
- ADR-0011 (topologia de deploy, `numReplicas=1`) — pré-condição que torna ISR seguro sem
  problema de cache desatualizado entre réplicas.
- ADR-0009 (feature flags) — `PublicBillingFeatureFlagGuard` segue o mesmo padrão de
  `PUBLIC_SUPPORT_FORM_ENABLED` (404 fail-closed).
- ADR-0014 (Better Stack) — `TelemetryService.captureMessage` usado em toda sobrescrita
  monetária automática da reconciliação, para rastreabilidade.
