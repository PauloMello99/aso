# Billing Stripe — teste local (sem ngrok)

Guia operacional pra testar o módulo `modules/subscriptions` (M11 — checkout, trial,
portal, webhook, comp/desconto admin) contra a API real do Stripe em **modo teste**,
sem precisar expor a porta local via ngrok/túnel. Racional do mecanismo em
[`.memory/adr/0016-billing-stripe-assinatura.md`](../.memory/adr/0016-billing-stripe-assinatura.md).

## Separação por ambiente (staging vs produção)

Não há namespacing de `lookup_key`/produto por ambiente no código — a fronteira de
ambiente é a **separação test/live do próprio Stripe** (mesmo modelo do Larmony):

- **Staging** usa uma chave `sk_test_...` → todos os produtos/preços/assinaturas vivem no
  **modo test** da conta Stripe.
- **Produção** usa uma chave `sk_live_...` → tudo no **modo live**.

Test e live são bancos de dados separados dentro do Stripe, então o mesmo `lookup_key`
literal (`ink-ops-standard-monthly`) nunca colide entre os dois. O `PlanCatalogService`
no boot é idempotente (resolve o produto por id determinístico `ink-ops-standard` e o
preço por `lookup_key`), então múltiplos ambientes no mesmo modo **convergem** nos mesmos
objetos em vez de duplicar.

> **Preço**: mudar `priceCents` no `plan-catalog.ts` dispara uma rotação de preço no boot
> (preços do Stripe são imutáveis) — o service cria um preço novo com
> `transfer_lookup_key: true`, movendo o `lookup_key` do preço antigo pro novo. Antes de
> configurar **produção** (modo live), garanta que o `priceCents` reflete o valor real
> (hoje R$400,00 = `40000`), senão o boot cria um plano cobrável errado.

> **Webhook secret de produção**: NÃO é o secret do Stripe CLI. É o signing secret do
> endpoint de webhook criado no dashboard/API do Stripe em **modo live**, apontando pro
> backend deployado (`https://<backend>/webhooks/stripe`). Idem staging, em modo test.

## Pré-requisitos

- Conta Stripe em modo teste, com chave secreta (`sk_test_...`).
- [Stripe CLI](https://docs.stripe.com/stripe-cli) instalado e autenticado (`stripe login`).
- `apps/backend/.env` com `STRIPE_SECRET_KEY` preenchida (chave de teste).

## 1. Obter o webhook signing secret

O Stripe CLI gera um secret de webhook estável por device — não precisa criar um
endpoint no dashboard do Stripe pra testar local:

```powershell
stripe listen --print-secret
```

Copie o valor (`whsec_...`) para `STRIPE_WEBHOOK_SECRET` em `apps/backend/.env`.

## 2. Subir o backend e o forwarder

Em dois terminais separados:

```powershell
# Terminal 1 — backend
pnpm --filter backend dev

# Terminal 2 — forwarder de webhook
stripe listen --forward-to localhost:3001/webhooks/stripe
```

> Dentro de sessões do Claude Code, ambos os processos já estão registrados em
> `.claude/launch.json` (`backend` e `stripe-webhook`) — dá pra subir os dois via a
> ferramenta de preview em vez de abrir terminais manualmente. `stripe listen` não
> abre porta própria (é só um forwarder), então a config usa `"port": 9900` como
> placeholder somente pra satisfazer a ferramenta de preview — ignore esse número,
> o secret real aparece no log do processo (`whsec_...`).

No boot, o `PlanCatalogService` sincroniza o catálogo estático (`domain/plan-catalog.ts`)
com o Stripe via `lookup_key` — cria Product+Price se não existirem ainda. Confirme via
`SELECT * FROM billing_plans;` que a linha `standard` tem `stripe_product_id`/
`stripe_price_id` preenchidos.

## 3. Bateria de testes manuais

Cartão de teste padrão: `4242 4242 4242 4242`, qualquer data futura, qualquer CVC.

| Cenário | Como testar | Confirma |
|---|---|---|
| Checkout básico | `POST /orgs/:orgId/subscription/checkout` (owner) → abrir a `url` retornada → pagar com o cartão de teste | Webhook `checkout.session.completed` + `customer.subscription.created` sincronizam a subscription local pra `active`/`standard` |
| Trial self-serve | Mesmo fluxo, org com `trialConsumed=false` → checkout deve pedir cartão (`payment_method_collection: always`) mas cobrar só após 60 dias | `trial_consumed` continua `false` até o webhook `checkout.session.completed`/`customer.subscription.updated` confirmar `trial_end` — **`stripe listen` precisa estar rodando** (terminal 2) para a coluna virar `true`; sem o forwarder ativo, ela fica `false` mesmo com o checkout concluído. Assinatura entra como `trialing` |
| Portal | `POST /orgs/:orgId/subscription/portal` (org já vinculada ao Stripe) → abrir a `url` | Portal do Stripe abre; ações lá (trocar cartão, cancelar) dependem de webhook pra refletir localmente |
| Webhook idempotente | `stripe trigger customer.subscription.updated` duas vezes seguidas (ou reenviar o mesmo evento) | Segunda entrega não reprocessa (`stripe_webhook_events.processed_at` já preenchido) |
| Comp/isenção (admin) | `POST /admin/orgs/:orgId/subscription/comp` (super_admin) | Cancela qualquer assinatura Stripe ativa da org primeiro; nunca cria cupom |
| Desconto (admin) | `POST /admin/orgs/:orgId/subscription/discount` numa org já vinculada ao Stripe | Cupom real criado e aplicado (visível no dashboard Stripe, modo teste) |
| Gating | Marcar uma org como `free`/`canceled` (via admin ou SQL local) → tentar uma escrita num módulo core (ex. `POST .../cashier/categories`) | 402 `SUBSCRIPTION_REQUIRED`; leitura continua liberada |
| Cron | `POST /internal/cron/tick` (header `x-cron-secret`) | Jobs `billing-reconciliation` e `billing-expiry-sweep` aparecem no array `jobs` com `status: ok` |
| Cancelamento agendado (dono) | Org owner com assinatura `active`/`trialing` vinculada ao Stripe → tela Assinatura → "Cancelar assinatura" → confirmar no dialog (ou `POST /orgs/:orgId/subscription/schedule-cancellation`) | Sem reload manual, a seção troca para "Encerra em <data>" + aviso; no dashboard Stripe (modo teste) a subscription fica "Cancels at period end"; `SELECT cancel_at_period_end, canceled_at, status FROM subscriptions WHERE org_id=…` reflete `true`. Deixar o `customer.subscription.updated` chegar pelo forwarder e reconferir: write-always → mesmo valor, não inverte |
| Reativação (dono) | Após o anterior, "Reativar assinatura" (sem dialog) ou `POST /orgs/:orgId/subscription/resume` | Rótulo volta para "Próxima cobrança", aviso some, `cancel_at_period_end` `false` e `canceled_at` `NULL` no banco. `resume` com a flag já `false` → 409 `SUBSCRIPTION_NOT_SCHEDULED_FOR_CANCELLATION`; org `past_due` → 409 `SUBSCRIPTION_NOT_RESUMABLE`/`SUBSCRIPTION_NOT_CANCELABLE` (caminho é o portal) |
| Espelho de reembolso (T4-F3) | **Pré-requisito**: `charge.refunded` na lista de eventos do endpoint de webhook Stripe (test e live). No dashboard Stripe (modo teste), emitir um refund total e depois um parcial num charge de uma org vinculada → `stripe listen` encaminhando | Cada `charge.refunded` grava 1 linha por refund em `billing_refund_events` (`SELECT stripe_refund_id, status, amount_cents, org_id, occurred_at FROM billing_refund_events`), com `org_id` resolvido de `charge.customer` → `subscriptions.stripe_customer_id` e `occurred_at` = `event.created`. Reenviar o mesmo evento **não** duplica (unique `(stripe_refund_id, status)`). `GET /admin/orgs/:orgId/subscription/refunds` (super_admin) lista as linhas, `occurred_at DESC` (teto 100, sem marcador de truncamento até F4/F5). Refund sem customer mapeável → linha com `org_id NULL` (não aparece no endpoint por-org). `charge.refunded` sem a chave `refunds` no payload → `telemetry` `BILLING_REFUND_EVENT_PAYLOAD_MISSING_REFUNDS`. **NÃO exercitado ao vivo nesta entrega** (chave do `stripe` CLI expirada) — cobertura por unit test com payload assinado |

> **Cenário — checkout abandonado (2026-08-17):** abrir `POST .../subscription/checkout`,
> pegar a `url`, e **fechar a aba sem pagar** (ou fechar antes do redirect de sucesso) **NÃO
> queima o trial** — `trial_consumed` permanece `false`, e a organização pode tentar
> novamente depois. A coluna só vira `true` quando o Stripe confirma via webhook que o trial
> de fato começou (`trial_end` preenchido). Ver `.memory/adr/0016-billing-stripe-assinatura.md`
> (Addendum 2026-08-17) para o bug histórico (trial era queimado na criação da checkout
> session) e a correção.

## Bugs reais só encontrados testando com webhook ao vivo

Documentado como reforço de por que esta bateria manual não é opcional (mesma lição do
Larmony, replicada aqui — ver `.memory/adr/0016-billing-stripe-assinatura.md`):

- Idempotência do webhook: uma falha no meio do processamento (após o `claim`, antes do
  `markProcessed`) descartava silenciosamente o retry do Stripe — só apareceu testando o
  caminho de erro de verdade, não em unit test com mocks felizes.
- URL de retorno do checkout/portal precisa usar o **slug** da org, nunca o `uuid` — um
  bug real de outro projeto (Larmony) que motivou essa regra aqui desde o início.
- `current_period_start/end` e `price` do subscription do Stripe (API v22+) ficam em
  `subscription.items.data[0]`, não no nível raiz do objeto — exemplos desatualizados na
  documentação do Stripe ainda mostram o formato antigo.
- **`trial_consumed` marcado cedo demais (2026-08-17):** o código original marcava
  `trial_consumed = true` ao **criar** a checkout session, não ao confirmar o trial —
  qualquer checkout abandonado queimava o trial de 60 dias permanentemente. Só ficou óbvio
  testando o fluxo "abrir checkout e não terminar" de propósito; testes unitários com mocks
  não exercitam esse caminho porque não há webhook nenhum envolvido no bug (o problema era
  justamente escrever antes do Stripe confirmar). Corrigido: a escrita migrou para o sync do
  Stripe (webhook + cron), condicionada a `trial_end` vir preenchido — ver ADR-0016 addendum.
