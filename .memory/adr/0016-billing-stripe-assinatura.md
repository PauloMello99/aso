# ADR-0016 — Billing (Stripe): trial + assinatura + entitlements (M11)

**Status:** Aceito
**Data:** 2026-07-18

## Contexto

M11 é o último milestone do backlog original (`docs/planning/2026-07-10-meeting-backlog.md`,
F11) — todos os demais (M0–M10) estão concluídos e mergeados. O ink-ops precisa de billing
real via Stripe (trial + assinatura paga); hoje não existe nenhum módulo de billing: a tabela
`subscriptions` já existe desde a migration baseline
(`apps/backend/drizzle/migrations/0000_magenta_swarm.sql`, `apps/backend/src/database/schema/subscriptions.ts`)
com os enums `subscription_type` (`free|trial|standard|custom`) e `subscription_status`
(`active|trialing|past_due|canceled|cancelled`), mas nenhum código a usa — é puro shell,
igual ao ponto de partida do Larmony antes do seu ADR-0026.

Referência de implementação (decisão do responsável, registrada no backlog): basear-se no
projeto separado Larmony (`C:\Users\Paulo\Documents\Repos\Pessoal\larmony`), especificamente
`.memory/adr/0026-billing-stripe-entitlements.md` (mecanismo original: comp/desconto,
webhook idempotente, `EntitlementsService`) e sua evolução
`.memory/adr/0029-subscription-paid-only-2-tiers.md` (fim do freemium, trial self-serve via
Checkout, `ActiveSubscriptionGuard` não-global). O ink-ops adapta o modelo household→org e
simplifica para **tier único** (o Larmony evoluiu para 2 tiers — Essencial/Completo — por
decisão de produto própria dele; o ink-ops não tem esse requisito).

## Decisão

1. **Reaproveitar a tabela `subscriptions` existente, sem novo enum de tier.** O enum
   `subscription_type` (`free|trial|standard|custom`) já cobre o necessário: `standard` é o
   único tier pago, `custom` é usado para comp/isenção, `trial`/`free` para os estados sem
   cobrança ativa. **Decisão explícita do responsável**: não criar um enum
   `subscription_tier` novo — multi-tier fica fácil de adicionar depois (como o Larmony fez
   via ADR-0029) se algum dia for necessário, mas não há requisito de produto para isso hoje.

2. **Trial via `trial_period_days` nativo do Stripe Checkout, com cartão obrigatório.**
   2 meses de trial, `payment_method_collection: "always"` — todo trial passa pelo Checkout
   com cartão, o que preserva tracking real de conversão trial→pago (mesmo racional do
   ADR-0029 do Larmony: sem cartão upfront, quem nunca deu cartão não é comparável a quem
   deu e não converteu). Não é implementado como cupom — é o parâmetro nativo de trial do
   próprio Checkout Session.

3. **Isenção/comp é 100% local, nunca cria/toca cupom Stripe.** Ao conceder: `type='custom'`,
   `status='active'`, `priceCents=0`; se existir uma Stripe subscription ativa, ela é
   **cancelada via API** de forma idempotente (nunca cobrar em paralelo a um comp) —
   `stripeCustomerId` é preservado para permitir reverter sem perder o vínculo. Reversível
   só localmente (revogar → volta a `free`/`locked`, sem apagar dado nenhum da organização).

4. **Desconto parcial é o único caso real que usa a Coupon API do Stripe** — o valor
   efetivamente cobrado tem que continuar sendo resolvido pelo Stripe (é quem emite fatura e
   cobra o cartão); replicar isso localmente duplicaria lógica de faturamento sem necessidade.
   Cache local (`discountPercent`/coupon id) é só para exibição no admin.

5. **Nova tabela `stripe_webhook_events` para idempotência**: `INSERT ... ON CONFLICT DO
   NOTHING RETURNING` usado como *claim* do evento — se a query não retorna linha, o evento
   já foi processado e o handler responde 200 sem reprocessar. **RLS habilitado, mas sem
   nenhuma policy** — a tabela não tem `GRANT` para o role de aplicação (`app_user`); só
   `DRIZZLE_ADMIN` a acessa. Isso é diferente de "sem RLS": a proteção vem de RLS habilitado
   + zero policy (nega tudo por padrão), não da ausência de RLS.

6. **`EntitlementsService.resolve(orgId)` como ponto único de gating server-side.** Qualquer
   rota/feature que precise saber se a organização pode escrever consulta este serviço —
   nenhuma lógica de billing duplicada em use-cases individuais.

7. **Modelo de tier: único tier pago (`standard`), paid-only.** Sem pagamento ativo
   (`free`/`trial` expirado/`canceled`) o estado resolvido é `locked` — bloqueia **só
   escrita**, nunca leitura nem apaga dado da organização. Reaproveita o enum
   `subscription_type` existente (item 1); não há régua de capabilities por tier porque só
   existe um tier pago.

8. **`ActiveSubscriptionGuard` não é `APP_GUARD` global** — é aplicado por-controller, sempre
   **depois** de `AuthGuard` + `OrgMembershipGuard`. Um guard global rodaria antes do
   `AuthGuard` e criaria um vetor de probing pré-autenticação (qualquer UUID de organização
   adivinhado poderia disparar `resolve()`/`getOrCreate()` sem sessão válida) — mesmo defeito
   identificado e corrigido por revisão de arquitetura no PR1 do ADR-0029 do Larmony, aplicado
   aqui preventivamente desde o desenho.

9. **`suspendedAt` (suspensão manual do super_admin, já existente) sempre vence sobre o
   gating por billing.** São camadas independentes: uma organização pode estar com assinatura
   ativa e ainda assim suspensa pelo super_admin (violação de termos, por exemplo), e o
   inverso (assinatura `locked` mas não suspensa) também é um estado válido e distinto.

10. **Backfill de organizações existentes sem linha em `subscriptions`**: `locked`
    (`free`/`canceled`) por padrão — **exceto** a organização do owner (Ink House, slug
    `nokafolqpwcvwqdkuwux`), que recebe **comp perpétuo** (`type='custom'`,
    `compExpiresAt=NULL`) na própria migration de backfill, para não perder acesso de
    escrita no merge deste milestone. Decisão explícita do responsável.

11. **Gotcha de API Stripe (SDK v22+, confirmado também no Larmony)**: no objeto
    `Subscription`, `current_period_start`/`current_period_end` e `price` **não estão no
    nível raiz** — vivem em `sub.items.data[0]`. Qualquer normalização de subscription
    (webhook, reconciliação) precisa ler dali, não do topo do objeto.

## Consequências

- Novo módulo `modules/subscriptions` (mesmo padrão Clean Architecture dos demais módulos:
  use-cases, repositório com Symbol token, `DomainException` próprias).
- 3 tabelas novas: `stripe_webhook_events` (idempotência, sem GRANT a `app_user`),
  `billing_plans` (cache local do catálogo de planos espelhado do Stripe),
  `billing_invoice_events` (histórico de faturas para exibição no admin).
- Colunas novas na tabela `subscriptions` existente (aditivas — sem substituir o schema já
  presente desde a migration baseline): campos de coupon/desconto, campos de comp
  (`compReason`, `compGrantedBy`, `compExpiresAt`).
- Entregue em 3 PRs sequenciais: **M11a** (catálogo de planos + checkout + webhook),
  **M11b** (trial + billing portal + `EntitlementsService`/`ActiveSubscriptionGuard`/gating),
  **M11c** (admin: comp/desconto + painel + cron de reconciliação/expiração).
- `stripe_webhook_events` é a primeira tabela do ink-ops sem nenhuma policy de acesso a
  cliente — precedente para futuras integrações externas via webhook.
- Endpoint de webhook precisa de `@SkipThrottle()` (o throttler global bloquearia picos de
  retry do Stripe) e de `rawBody: true` no Nest (necessário para `constructEvent` validar a
  assinatura antes do parser JSON global consumir o body).

## Alternativas rejeitadas

- **Enum `subscription_tier` novo (multi-tier desde já)**: rejeitada pelo responsável — não
  há requisito de produto para mais de um tier pago hoje; reaproveitar `subscription_type`
  evita migração de enum sem ganho imediato, e o caminho de evolução (visto no próprio
  Larmony/ADR-0029) permanece aberto se necessário no futuro.
- **Desconto também 100% local (sem tocar o Stripe)**: rejeitada pelo mesmo motivo do
  Larmony — divergiria do valor efetivamente cobrado pelo cartão do usuário; o Stripe
  continua sendo a régua de cobrança real.
- **`ActiveSubscriptionGuard` como `APP_GUARD` global**: rejeitada — vetor de probing
  pré-autenticação (item 8).
- **Backfill uniforme (`locked` para todas as orgs, sem exceção)**: rejeitada pelo
  responsável para a organização do próprio owner — perderia acesso de escrita no merge.

## Addendum (2026-08-17): `trial_consumed` marcado cedo demais — corrigido para write no sync do Stripe

**Bug**: `CreateCheckoutSessionUseCase` marcava `trial_consumed = true` no momento de
**criar** a checkout session do Stripe — antes de qualquer confirmação de pagamento. Um
checkout abandonado (aba fechada, hesitação, erro de cartão) queimava o trial de 60 dias
**permanentemente** para aquela organização, sem ela nunca ter sido cobrada ou ter
efetivamente entrado em trial no Stripe. Encontrado em auditoria da landing page
(`docs/product/landing-page-spec.md` §10.1, 2026-08-16) ao verificar se a promessa "60 dias
grátis" do hero era honesta.

**Correção**: `trial_consumed` deixou de ser escrito por `create-checkout-session.use-case.ts`
— o use-case só cria a Checkout Session, sem tocar a coluna. A escrita migrou para o único
lugar que sabe que o trial de fato aconteceu no Stripe: o **sync** de uma subscription
normalizada vinda do Stripe, via o novo predicado `shouldMarkTrialConsumed` (`domain/
subscription-sync.ts`) — `true` somente se `!current.trialConsumed && incoming.trialEndsAt
!== null`. Dois call sites, ambos já existentes no fluxo de sync:

- `HandleStripeWebhookUseCase::syncNormalizedSubscription` — caminho primário, dispara nos
  eventos `checkout.session.completed`/`customer.subscription.updated` quando o Stripe
  confirma `trial_end` preenchido.
- `ReconcileSubscriptionsUseCase` (cron) — rede de segurança para webhook perdido/atrasado,
  mas só alcança organizações já vinculadas ao Stripe: `findAllStripeLinked` exige
  `stripe_customer_id` **e** `stripe_subscription_id` não nulos. Um checkout cujo primeiro
  webhook nunca chegou (nenhum sync ocorreu, colunas locais todas `NULL`) fica fora do
  alcance do cron — mesma limitação documentada no cabeçalho da migration 0050 abaixo. O
  cron reconcilia **drift** de orgs já sincronizadas ao menos uma vez; não é uma garantia
  universal de que todo trial real acaba marcado.

O predicado nunca "desmarca": uma vez `true`, permanece `true` (write-once na prática, só
que agora disparado pelo evento certo).

**Migration de dados** (`0050_subscriptions_restore_unstarted_trials`, aplicada localmente):
restaura `trial_consumed = false` para organizações afetadas pelo bug no passado, com
predicado conservador (`trial_ends_at IS NULL AND stripe_subscription_id IS NULL AND type
<> 'custom'`) — só reverte quem nunca teve trial confirmado nem subscription no Stripe.
Limitação conhecida documentada no cabeçalho da própria migration: o predicado não
distingue checkout abandonado (alvo legítimo da correção) de checkout **concluído** cujo
webhook nunca chegou/foi processado (nesse caso o trial rodou de verdade no Stripe, mas as
colunas locais ficam `NULL` do mesmo jeito) — resíduo aceito, risco de no máximo um trial
extra por organização afetada, sem corrupção de dado nem vazamento entre orgs.

**Decisão explícita: sem rate-limit, sem coluna nova.** A correção reabre uma janela de
corrida teórica — dois checkouts completados em paralelo pela mesma organização podem, na
pior hipótese, conceder um trial extra (a segunda conclusão também teria `trial_ends_at`
preenchido e satisfaria `shouldMarkTrialConsumed` antes do primeiro sync gravar). Avaliada e
**aceita deliberadamente** sem mitigação adicional (sem rate-limit por org no checkout, sem
coluna de lock): o pior caso falha a favor do cliente (trial extra, nunca cobrança dupla ou
perda de acesso), e é uma corrida de segundos entre dois checkouts simultâneos da mesma org
— cenário raro o suficiente para não justificar a complexidade de um mecanismo novo.

## Addendum (2026-08-24): fluxo de trial verificado ponta a ponta contra Stripe real

Investigando um relato de que "o fluxo de assinar não permite usar os 60 dias de trial",
rodei o fluxo completo contra uma conta nova, sem mocks: `POST /auth/sign-up` → `POST /orgs`
→ `POST /orgs/:orgId/subscription/checkout` → completar o Stripe Checkout hospedado com
cartão de teste `4242...`. Resultado: `grantTrial` calculou `true` (org nova, `trialEndsAt`
null, `trialConsumed` false), a Checkout Session veio com `amount_total: 0` e "60 days free",
e a subscription criada no Stripe ficou com `status: "trialing"` e `trial_end - trial_start`
= exatamente 5184000s (60 dias). **Nenhum bug encontrado** — a lógica descrita no addendum de
2026-08-17 acima está correta e o relato original provavelmente antecede aquela correção.

**Gotcha de ambiente local descoberto no processo**: `SyncPlanCatalogUseCase` (boot) só
verifica o **Product** no Stripe quando já existe uma linha ativa em `billing_plan_prices`
para o (plano, intervalo) — nunca revalida o `stripe_price_id` guardado. Se a
`STRIPE_SECRET_KEY` do `.env` for trocada para uma conta Stripe diferente (rotação de chave
para a conta errada, por exemplo), o app sobe sem erro nenhum e só quebra depois, no
`createCheckoutSession`, com `No such price: '...'`. `ReconcilePlanCatalogUseCase` (cron,
"Stripe manda") eventualmente detecta e desativa a linha local (`active: false`), mas **não
recria** a linha ativa automaticamente — isso exige uma ação explícita de admin
(`POST /admin/billing/plans/:key/prices`, problema 4), o que pode falhar com "already uses
that lookup key" se já existir um Price com aquele `lookup_key` na conta nova (nesse caso o
certo é adotar o Price existente via `GET /v1/prices?lookup_keys[]=...` e escrever direto na
linha, não tentar criar um novo). Vale conferir sempre, ao trocar `STRIPE_SECRET_KEY`
localmente, se o `stripe config --list` do Stripe CLI (`acct_id`) bate com a conta da nova
chave — divergência silenciosa aqui custou a maior parte do tempo de debug desta sessão.

## Addendum (2026-08-30): T4-F1 — espelhar `cancel_at_period_end` do Stripe

**Contexto**: o cancelamento agendado do Stripe (`cancel_at_period_end`) não era refletido
no espelho local — marcar "cancelar ao fim do período" no dashboard do Stripe (ou, no
futuro, via feature self-service) não chegava ao banco nem à UI da org.

**Decisão**:

1. **Coluna booleana** `subscriptions.cancel_at_period_end boolean NOT NULL DEFAULT false`
   (migration `0059`), espelho fiel do campo do Stripe — que é `boolean` na raiz de
   `Stripe.Subscription` em `stripe@22.3.2` (ao contrário de `current_period_start/end`, que
   a v22 moveu para `items.data[0]`). O "quando" do corte já é `current_period_end`; nenhuma
   coluna de data nova. `cancel_at` (data de cancelamento arbitrária) fica **fora de escopo**
   até uma feature exigir — entra como coluna adicional, sem migrar a booleana.

2. **Write-ALWAYS** no sync, em contraste explícito com o write-once de `trialConsumed` (ver
   addendum de 2026-08-17). Tanto `HandleStripeWebhookUseCase.syncNormalizedSubscription`
   quanto `ReconcileSubscriptionsUseCase.reconcileOne` gravam `cancelAtPeriodEnd` de forma
   incondicional (não num spread condicional): se o usuário **desmarca** o cancelamento no
   Stripe, o espelho volta a `false`. `reconcileOne` inclui o campo na comparação de drift
   (`!==` direto, sem `.getTime()` — é boolean).

3. **Zerar ao encerrar localmente**: `grant-comp` (converte em cortesia),
   `handleSubscriptionDeleted`, o branch de "subscription sumiu do Stripe" da reconciliação,
   e `ExpireSubscriptionsUseCase` (`expireComps` + `lockExpiredPastDue`) gravam
   `cancelAtPeriodEnd: false` no payload de encerramento — uma assinatura já encerrada com
   `cancel_at_period_end=true` seria espelho infiel.

4. **Exposição**: a `SubscriptionEntity` ganha `cancelAtPeriodEnd` como **readonly prop**
   (não getter — o controller serializa a entity direto e getters de classe não sobrevivem
   ao `JSON.stringify`). `GET /orgs/:orgId/subscription` passa a incluir o campo sem
   alteração de use-case/controller/DTO. No frontend, `ActiveSection` troca o rótulo
   "Próxima cobrança" por "Encerra em <data>" e mostra um aviso (`text-warning`) quando
   `cancelAtPeriodEnd && currentPeriodEnd`.

**Edge case aceito e documentado**: para orgs cortesia (`type === 'custom'`),
`shouldApplyStripeSync` retorna `false` e `findAllStripeLinked` exige `stripe_subscription_id`
não-nulo — então um cancelamento agendado feito no dashboard do Stripe **nunca reflete
localmente** para elas. É desejado (proteger a cortesia de webhook fora de ordem), não bug;
`grant-comp` já força `false` ao converter.

**Ordenação de deploy**: `DrizzleSubscriptionRepository` usa `.select()` sem argumentos →
Drizzle emite lista **explícita** de colunas incluindo `cancel_at_period_end`. A migration
`0059` DEVE ser aplicada **antes** do deploy da app; o rollback só é seguro **depois** de
reverter a app. Vale para todo valor de coluna novo lido pelo repo.

**Dívida técnica registrada**: `apps/backend/src/database/types_db.ts` (gerado pelo Supabase
CLI) fica defasado até `pnpm db:gen-types` — sem impacto funcional (a persistência tipa por
`$inferSelect` do Drizzle, não pelos tipos Supabase).

## Addendum (2026-08-31): T4-F2 — cancelamento agendado self-service pelo dono

**Contexto**: com a F1 espelhando `cancel_at_period_end`, o dono da org passa a poder
**agendar o cancelamento** da própria assinatura e **desfazer** de dentro da plataforma, sem
ir ao portal do Stripe.

**Decisão**:

1. **Dois endpoints owner-only, sem body**: `POST /orgs/:orgId/subscription/schedule-cancellation`
   e `POST /orgs/:orgId/subscription/resume`, atrás de `OrgOwnerGuard`. Um use-case por
   operação (`ScheduleSubscriptionCancellationUseCase` / `ResumeSubscriptionUseCase`), sem
   DTO — evita o controller ramificar num boolean do cliente.

2. **Boolean-only.** `cancel_at` (data arbitrária de cancelamento) permanece **fora de
   escopo** — a feature self-service é "cancelar (efetivo no fim do período)", que é
   exatamente `cancel_at_period_end`. A frase "fica para F2" da nota de sessão de 30/08 era
   imprecisa e fica corrigida aqui. `cancel_at` entra como coluna adicional se/quando uma
   feature exigir cancelamento em data marcada.

3. **Sem `idempotencyKey`** na chamada `stripe.subscriptions.update` do toggle — diferente de
   `updateSubscriptionPrice`, onde a chave protege contra rateio duplicado (efeito
   financeiro). Aqui é set de um boolean para valor fixo; uma chave determinística faria um
   ciclo schedule→resume→schedule dentro da janela de 24h do Stripe reproduzir o body
   cacheado do primeiro request, gravando no espelho um estado que o Stripe não tem.

4. **Payload de escrita estreito** — `subscriptionRepo.update` recebe **só**
   `{ cancelAtPeriodEnd, canceledAt, currentPeriodEnd, status }` do normalizado, não o bloco
   largo de `migrate-subscribers-to-price`. Motivo: consistência com o padrão local de
   descontos — `stripeCouponId`/`discountPercent` são geridos só por `apply-discount`/
   `remove-discount`, e `toNormalizedSubscription` os fixa em `null`. **Nota**: isso NÃO
   impede o webhook (`syncNormalizedSubscription`, que grava o bloco largo) de zerar o
   desconto no espelho no próximo `customer.subscription.updated` — esse é um defeito
   pré-existente do webhook, rastreado em follow-up separado (não introduzido por T4-F2).

5. **Guard** `isActiveLike` (`active` | `trialing`) `&& isStripeLinked`. `past_due` e
   cortesia (`type='custom'`, nunca `isStripeLinked`) ficam fora — o caminho para `past_due`
   segue sendo o portal do Stripe (regularizar pagamento antes de cancelar). Assimetria
   deliberada: agendar 2x é no-op idempotente (clique duplo num fluxo destrutivo não vira
   erro); `resume` com a flag já `false` é 409 (`SUBSCRIPTION_NOT_SCHEDULED_FOR_CANCELLATION`).
   Códigos novos: `SUBSCRIPTION_NOT_CANCELABLE`, `SUBSCRIPTION_NOT_SCHEDULED_FOR_CANCELLATION`,
   `SUBSCRIPTION_NOT_RESUMABLE`, `SUBSCRIPTION_STRIPE_MISSING` (todos 409). `resource_missing`
   do Stripe é traduzido para `SUBSCRIPTION_STRIPE_MISSING` no gateway em vez de vazar 500.

6. **Auditoria** no padrão `grant-comp`: `action: 'subscription_changed'`,
   `metadata.operation: 'schedule_cancellation' | 'resume'`, sem PII.

7. **UI** em `ActiveSection` e `TrialingSection` (o dono pediu nos dois; o use-case aceita
   `trialing`): botão "Cancelar assinatura" (com `ConfirmDialog` destrutivo) quando a flag é
   `false`, "Reativar assinatura" (sem dialog, é reversão) quando `true`. Botões gateados por
   `canManageStripe` (`stripeCustomerId && stripeSubscriptionId`), alinhado ao guard do
   backend. O aviso "vai encerrar em <data>" agora vale para as duas seções.

**Por que não é redundante com o portal do Stripe**: reflexo imediato no espelho local (sem
esperar o webhook) e UX in-app; o portal continua como caminho único para forma de pagamento
e para `past_due`.

## Addendum (2026-08-31): T4-F3 — espelho de reembolsos do Stripe

**Contexto**: o sistema rastreava invoices (`billing_invoice_events`: paid/payment_failed)
mas **nenhum reembolso** — `charge.refunded` / `refund.*` não eram consumidos, e um refund
feito no dashboard do Stripe ficava invisível ao sistema. Escopo de F3: **só espelhar**
(tabela + webhook + endpoint read-only). **Não** inclui ação de emitir reembolso (T4-F4),
**não** inclui UI (F4/F5), **não** inclui reconciliação de refunds (F5).

**Decisão**:

1. **Tabela `billing_refund_events` (migration `0060`) append-only, com unique
   `(stripe_refund_id, status)` + `onConflictDoNothing`** — **uma linha por status distinto
   alcançado** por um refund; reentrada no mesmo status é deduplicada por design. Nunca
   UPDATE/DELETE (append-only por analogia ao ADR-0010; espelha `billing_invoice_events`).
   O dedupe primário de evento continua sendo `stripe_webhook_events` (PK = `event.id`).
   Colunas: `stripe_refund_id`, `stripe_charge_id`, `org_id` (nullable, **sem FK**),
   `status` (enum `billing_refund_event_status`: pending/requires_action/succeeded/failed/
   canceled), `amount_cents` (integer; `Stripe.Refund.amount` já vem na menor unidade),
   `currency`, `reason`, `occurred_at`, `created_at`. RLS habilitada sem policy +
   `REVOKE ALL FROM anon, authenticated` (só `DRIZZLE_ADMIN` acessa).

2. **`occurred_at` vem do `event.created` do envelope do webhook** (quando observamos a
   transição), **não** de `refund.created` — senão as linhas do mesmo refund empatam e a
   linha do tempo fica não-ordenável (o writer de `billing_invoice_events` usa
   `entity.created`, que aqui daria empate total). O read-path ordena por
   `(occurred_at DESC, created_at DESC)`.

3. **Read-path é a tabela LOCAL** (`GET /admin/orgs/:orgId/subscription/refunds` →
   `ListSubscriptionRefundsUseCase` → `refundEventRepo.listByOrgId`, **teto de 100 linhas
   sem paginação nem marcador de truncamento** — como é 1 linha por status, isso é ~30-50
   refunds reais; paginação/marcador ficam para F4/F5). Diferente de `GET /invoices`, que lê
   **live** do Stripe — a API do Stripe **não tem list-by-customer de refunds**, então a
   tabela é a única fonte. O endpoint devolve `BillingRefundEventEntity[]` cru (com o PK
   interno `id` + `org_id`), não um shape normalizado como o `invoices` — mapear para um
   response shape explícito quando F4/F5 criar a UI consumidora. `orgId` vem do path +
   `PlatformAdminGuard` (super_admin only); com `DRIZZLE_ADMIN` bypassa RLS, então o
   `WHERE org_id = $1` é a única fronteira de tenant — o `orgId` **nunca** pode vir do body.

4. **F3 escuta só `charge.refunded`** (o event traz `Stripe.Charge` com `customer` inline +
   `charge.refunds.data[]`; cobre o caso comum de refund de cartão instantâneo, org mapeada
   via `charge.customer` → `subscriptions.stripe_customer_id`). Fica para **F5**:
   `refund.updated` (transições assíncronas), reconciliação de refunds, `charge.refunds.
   has_more` truncado.

5. **Status desconhecido/`null` do Stripe é DESCARTADO** com `logger.warn` +
   `telemetry.captureMessage("warn", { code: "BILLING_REFUND_EVENT_UNKNOWN_STATUS", ... })`
   e `continue` (os demais refunds do mesmo charge são inseridos). Sem esse guard, um valor
   novo do Stripe (`Refund.status` é `string | null` nas typings) viraria
   `invalid input value for enum` → 500 em loop de retry. `has_more` truncado emite
   `BILLING_REFUND_EVENT_LIST_TRUNCATED`. Os dois são dívida coberta por F5. Se o volume de
   descartes aparecer na telemetria, a saída sancionada é trocar a coluna `status` para
   `text` numa migration futura.

6. **Sem novo valor de `audit_action`** (espelho puro webhook→tabela, sem ação manual) e
   **sem código novo em `DOMAIN_CODE_TO_STATUS`** (reusa `SubscriptionNotFoundException`).
   Refunds cujo `charge.customer` não mapeia entram com `org_id NULL` e ficam invisíveis ao
   endpoint por-org — deliberado, mesma semântica de `billing_invoice_events`; re-resolver o
   `org_id` (por linha nova, nunca UPDATE) é trabalho de F5.

**Pré-requisito de deploy (checklist, não código)**: `charge.refunded` precisa estar na
lista de eventos do endpoint de webhook do Stripe (**test E live**) — hoje essa lista é
gerenciada no dashboard do Stripe, não há config no repo. Sem esse passo o webhook nunca
chega e a fatia fica inerte, sem erro visível. Um `charge.refunded` que chega mas vem sem a
chave `refunds` no payload emite `telemetry.captureMessage(...,
{ code: "BILLING_REFUND_EVENT_PAYLOAD_MISSING_REFUNDS" })` — esse sinal é o instrumento de
verificação que substitui o round-trip ao vivo bloqueado.

**Sem verificação no preview**: F3 não tem superfície observável no navegador (endpoint
admin-only sem UI; query key `queryKeys.adminSubscription.refunds` sem consumidor até F4/F5).
O round-trip `charge.refunded` ao vivo não foi exercitável nesta entrega — a chave do
`stripe` CLI local está expirada; cobertura por unit tests do webhook com payload assinado
(incl. o caso ponta a ponta no controller spec) + roteiro em `docs/billing-local-testing.md`.

## Relacionado

- Larmony `.memory/adr/0026-billing-stripe-entitlements.md` — mecanismo original
  (comp/desconto/webhook/`EntitlementsService`), fonte de implementação de referência.
- Larmony `.memory/adr/0029-subscription-paid-only-2-tiers.md` — evolução paid-only e
  correção do `ActiveSubscriptionGuard` global; o ink-ops adota o modelo paid-only desde o
  início, sem passar por uma fase freemium.
- ADR-0005 (multi-tenancy: DB único + `org_id` + RLS) — `stripe_webhook_events` segue o
  padrão de RLS habilitado sem policy para tabelas invisíveis ao cliente.
- ADR-0013 (super_admin age como owner) — `suspendedAt` é ortogonal ao gating de billing
  deste ADR.
- `docs/planning/2026-07-10-meeting-backlog.md` (F11/M11) — origem do requisito de produto.
