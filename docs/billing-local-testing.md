# Billing Stripe — teste local (sem ngrok)

Guia operacional pra testar o módulo `modules/subscriptions` (M11 — checkout, trial,
portal, webhook, comp/desconto admin) contra a API real do Stripe em **modo teste**,
sem precisar expor a porta local via ngrok/túnel. Racional do mecanismo em
[`.memory/adr/0016-billing-stripe-assinatura.md`](../.memory/adr/0016-billing-stripe-assinatura.md).

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

No boot, o `PlanCatalogService` sincroniza o catálogo estático (`domain/plan-catalog.ts`)
com o Stripe via `lookup_key` — cria Product+Price se não existirem ainda. Confirme via
`SELECT * FROM billing_plans;` que a linha `standard` tem `stripe_product_id`/
`stripe_price_id` preenchidos.

## 3. Bateria de testes manuais

Cartão de teste padrão: `4242 4242 4242 4242`, qualquer data futura, qualquer CVC.

| Cenário | Como testar | Confirma |
|---|---|---|
| Checkout básico | `POST /orgs/:orgId/subscription/checkout` (owner) → abrir a `url` retornada → pagar com o cartão de teste | Webhook `checkout.session.completed` + `customer.subscription.created` sincronizam a subscription local pra `active`/`standard` |
| Trial self-serve | Mesmo fluxo, org com `trialConsumed=false` → checkout deve pedir cartão (`payment_method_collection: always`) mas cobrar só após 60 dias | `trial_consumed` vira `true` antes mesmo do redirect ao Stripe (write-once); assinatura entra como `trialing` |
| Portal | `POST /orgs/:orgId/subscription/portal` (org já vinculada ao Stripe) → abrir a `url` | Portal do Stripe abre; ações lá (trocar cartão, cancelar) dependem de webhook pra refletir localmente |
| Webhook idempotente | `stripe trigger customer.subscription.updated` duas vezes seguidas (ou reenviar o mesmo evento) | Segunda entrega não reprocessa (`stripe_webhook_events.processed_at` já preenchido) |
| Comp/isenção (admin) | `POST /admin/orgs/:orgId/subscription/comp` (super_admin) | Cancela qualquer assinatura Stripe ativa da org primeiro; nunca cria cupom |
| Desconto (admin) | `POST /admin/orgs/:orgId/subscription/discount` numa org já vinculada ao Stripe | Cupom real criado e aplicado (visível no dashboard Stripe, modo teste) |
| Gating | Marcar uma org como `free`/`canceled` (via admin ou SQL local) → tentar uma escrita num módulo core (ex. `POST .../cashier/categories`) | 402 `SUBSCRIPTION_REQUIRED`; leitura continua liberada |
| Cron | `POST /internal/cron/tick` (header `x-cron-secret`) | Jobs `billing-reconciliation` e `billing-expiry-sweep` aparecem no array `jobs` com `status: ok` |

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
