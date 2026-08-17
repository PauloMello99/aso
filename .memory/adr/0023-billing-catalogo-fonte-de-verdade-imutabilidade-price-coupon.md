# ADR-0023 — Catálogo de billing: banco como fonte de verdade + imutabilidade de Price/Coupon no Stripe

**Status:** Aceito (parcialmente superseded — ver ADR-0024)
**Data:** 2026-08-15

> **Nota (2026-08-16):** ADR-0024 reestruturou a modelagem de preço (`billing_plans` passou a
> guardar só dados de produto; preço por intervalo vive em `billing_plan_prices`, N por plano)
> e removeu o endpoint de sync manual. Como consequência, as referências abaixo a
> `RotateBillingPlanPriceUseCase` e a `POST /admin/billing/plans/sync` estão **desatualizadas**
> — foram substituídas por `RotatePlanIntervalPriceUseCase` (por intervalo) e o endpoint de
> sync manual foi deletado (`SyncPlanCatalogUseCase` só roda no boot). O conteúdo deste ADR
> sobre **imutabilidade de Price/Coupon no Stripe** (itens 2-4) continua correto e vigente —
> não foi alterado pelo ADR-0024. Ver ADR-0024 para a modelagem multi-preço, a reconciliação
> periódica invertida via cron e o endpoint público de preços.

## Contexto

O ADR-0016 (M11) entregou o billing Stripe (trial + assinatura + entitlements), mas o
gerenciamento do **catálogo** (planos e cupons) por `super_admin` ainda não existia: o array
hardcoded `PLAN_CATALOG`
(`apps/backend/src/modules/subscriptions/domain/plan-catalog.ts`) era a única fonte de
verdade, e `PlanCatalogService.onModuleInit()` sincronizava o Stripe a cada boot —
**rotacionando o Price de volta ao valor hardcoded** sempre que detectava divergência. Isso
tornava impossível qualquer edição de preço feita por um super_admin: o próximo deploy
revertia. Além disso, esse `onModuleInit` só logava erro via `Logger.error`, que **nunca**
chega ao Better Stack — só exceções HTTP capturadas pelo `AllExceptionsFilter` chegam lá
(ADR-0014); uma falha de sync no boot ficava silenciosa em produção.

Este módulo (gestão de catálogo Stripe: planos + cupons para `super_admin`) foi implementado
sobre essa base, e junto vieram decisões arquiteturais duráveis sobre como o Stripe modela
imutabilidade de `Price`/`Coupon` — não óbvias e fáceis de reintroduzir errado numa sessão
futura que precise "editar o preço de um plano" ou "editar um cupom".

## Decisão

1. **Inversão da fonte de verdade: `billing_plans` (banco) manda, `PLAN_CATALOG` é só seed.**
   O array hardcoded só é usado para popular a linha inicial quando ainda não existe registro
   em `billing_plans` para aquela chave. O sync (`SyncPlanCatalogUseCase`, disparável também
   via `POST /admin/billing/plans/sync`) **não rotaciona mais preço automaticamente** — ao
   detectar que o `unitAmount` do Price no Stripe diverge do `billing_plans.amountCents`
   local, reporta `status: "drift"` e para aí; a correção é sempre uma ação explícita do
   super_admin (endpoint de rotação, item 2). `onModuleInit` agora usa
   `TelemetryService.captureException` diretamente em vez de só `Logger.error`, então uma
   falha de sync no boot chega ao Better Stack.

2. **Price do Stripe é imutável após criado — "editar preço" sempre significa: criar um novo
   Price + migrar o `lookup_key` + arquivar o antigo, nunca `PATCH unit_amount`.** O Stripe
   não permite alterar o valor de um Price existente. `RotateBillingPlanPriceUseCase`
   (`POST /admin/billing/plans/:key/price`) implementa a sequência correta: cria o novo Price
   com `transfer_lookup_key: true` (migra o `lookup_key` do Price antigo para o novo) e, **em
   uma chamada separada**, arquiva o antigo (`active: false`) — `transfer_lookup_key` NÃO
   desativa o Price antigo automaticamente. Assinantes com subscription já ativa **não** são
   migrados para o novo Price — o novo valor só vale para checkouts a partir dali; migrar
   assinantes existentes é decisão de negócio separada, fora deste escopo.

3. **Coupon do Stripe também é imutável na prática (`percent_off`/`amount_off`/`duration`
   nunca mudam pós-criação) — só `name`/`metadata` são editáveis nele.** O que de fato é
   editável é o **Promotion Code** por cima do Coupon, e mesmo assim só `active`/`metadata`
   (confirmado nos tipos do SDK `stripe@22.3.2`, `PromotionCodeUpdateParams` —
   `code`/`max_redemptions`/`expires_at` só existem no `create`, nunca no `update`). A
   plataforma sempre cria Coupon + Promotion Code **juntos**, 1:1 por decisão de produto
   deliberada — `billing_coupons.stripe_coupon_id` e `stripe_promotion_code_id` têm `UNIQUE`
   (migration `0047`) para impedir dois Promotion Codes para o mesmo Coupon.

4. **`percent_off` local é `integer`; o Stripe aceita float.** A plataforma só cria cupons
   com percentual inteiro (validado em `CreateBillingCouponUseCase`). A sincronização reversa
   via webhook (`coupon.created`/`coupon.updated`) **rejeita** (não trunca) um
   `coupon.percent_off` fracionário vindo de fora do app (ex.: criado direto no Dashboard do
   Stripe) — `Number.isInteger(remote.percentOff)` como guarda em
   `handle-stripe-webhook.use-case.ts`, com `captureMessage` de telemetria quando rejeita.

5. **Sincronização reversa (Stripe → plataforma) via webhook**, novos handlers em
   `handle-stripe-webhook.use-case.ts` para `product.updated`, `price.created/updated/deleted`,
   `coupon.created/updated/deleted`, `promotion_code.created/updated`. **Discriminador
   anti-corrida na rotação de Price** (o ponto mais crítico deste ADR): uma rotação
   (item 2) dispara **dois** eventos quase simultâneos — `price.created` para o novo Price
   (com o `lookup_key`) e `price.updated` para o antigo (que acabou de perder o `lookup_key`
   ao ser arquivado). Um handler ingênuo que aceitasse qualquer `price.created`/`price.updated`
   de um Price do produto do plano poderia, por ordem de chegada, persistir o Price
   **arquivado** como `billing_plans.stripe_price_id` — quebrando checkout silenciosamente.
   A guarda: só aceita o evento se `remote.active === true` **E** (`remote.lookupKey` bate com
   `plan.lookupKey` **e** o plano já tem `lookupKey` não-nulo, **OU** `remote.priceId` já é o
   `plan.stripePriceId` atual). Um bug real de colisão `null === null` nessa comparação foi
   corrigido durante a implementação: um plano ainda sem `lookupKey` sincronizado aceitava
   qualquer Price ativo do produto por engano.

## Consequências

- Novo módulo de uso na estrutura já existente `modules/subscriptions` (mesmo padrão Clean
  Architecture): use-cases `SyncPlanCatalogUseCase`, `RotateBillingPlanPriceUseCase`,
  `UpdateBillingPlanProductUseCase`, `CreateBillingCouponUseCase`, `UpdateBillingCouponUseCase`,
  `ListBillingCoupons/PlansUseCase`.
- Nova tabela `billing_coupons` (migration `0047`) seguindo o mesmo padrão já estabelecido
  para `billing_plans`/`stripe_webhook_events` (ADR-0016): tabela global (sem
  `organization_id`), RLS habilitado **sem nenhuma policy** (deny-all para
  `authenticated`/`anon` por padrão), acesso exclusivo via `DRIZZLE_ADMIN` — administrado só
  por `super_admin`.
- `Product` do Stripe **tem** campos mutáveis de verdade (`name`, `description`, `metadata`,
  `active`) — editáveis via `PATCH /admin/billing/plans/:key/product`
  (`UpdateBillingPlanProductUseCase`), espelhando Stripe + banco na mesma operação. Não
  confundir com a imutabilidade de `Price`/`Coupon` (itens 2 e 3) — é um objeto Stripe
  diferente com semântica diferente.
- `PlanCatalogService.onModuleInit` reporta falha de sync via `TelemetryService`, visível no
  Better Stack; `POST /admin/billing/plans/sync` permite redisparar manualmente sem novo
  deploy.

## Alternativas rejeitadas

- **Manter `PLAN_CATALOG` como fonte de verdade com auto-rotação no boot**: era o
  comportamento antes desta sessão — rejeitada porque tornava impossível qualquer edição de
  preço por super_admin (revertida a cada deploy). Divergência agora só é reportada
  (`status: "drift"`), correção é sempre ação explícita.
- **`PATCH` direto do valor (`unit_amount`) em um Price existente**: impossível pela própria
  API do Stripe — Price é imutável por design deles, não por escolha do ink-ops.
- **Editar `percent_off`/`amount_off`/`duration` de um Coupon existente**: mesma
  impossibilidade estrutural do Stripe — a única superfície editável pós-criação é o
  Promotion Code (`active`/`metadata`).
- **Truncar `percent_off` fracionário vindo do Dashboard em vez de rejeitar**: rejeitada — a
  coluna local é `integer` por decisão de produto (item 4); truncar mascararia silenciosamente
  um cupom criado fora do fluxo esperado da plataforma.

## Relacionado

- ADR-0016 (billing Stripe M11) — base deste módulo (`subscriptions`, `billing_plans`,
  `EntitlementsService`); este ADR estende o catálogo com gestão por super_admin.
- ADR-0005 (multi-tenancy, RLS) — `billing_coupons` segue o mesmo padrão de RLS habilitado
  sem policy já usado por `billing_plans`/`stripe_webhook_events`.
- ADR-0014 (Better Stack) — motivo pelo qual `Logger.error` sozinho não bastava no
  `onModuleInit`; corrigido usando `TelemetryService.captureException` diretamente.
