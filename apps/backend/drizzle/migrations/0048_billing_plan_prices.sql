-- 0048 — módulo financeiro (super_admin): preço por intervalo de cobrança.
-- billing_plan_prices passa a guardar N preços por plano (um por interval:
-- monthly/semiannual/annual), cada um independentemente editável e
-- habilitável. billing_plans continua existindo com as colunas antigas de
-- preço (amount_cents/currency/interval/stripe_price_id/lookup_key) até a
-- migration de contract (0050) — esta é só a etapa de EXPAND: cria a tabela
-- nova e faz backfill do preço atual do plano "standard", preservando o
-- stripe_price_id REAL (é o Price que a assinatura ativa em produção já
-- referencia; perdê-lo aqui quebraria checkout/webhook).
--
-- Regras de negócio (mesma classe de billing_plans/billing_coupons):
--   - RLS habilitado sem nenhuma policy — só DRIZZLE_ADMIN acessa.
--   - UNIQUE(stripe_price_id): global, nullable-safe (Postgres trata
--     múltiplos NULL como não-conflitantes). Price ID é IMUTÁVEL no Stripe,
--     nunca reutilizado entre linhas — UNIQUE global é seguro.
--   - lookup_key NÃO tem UNIQUE global: ele é TRANSFERÍVEL — uma rotação de
--     preço usa transferLookupKey:true no Stripe, movendo a chave do preço
--     antigo pro novo. A linha antiga (agora inativa) e a nova (ativa)
--     disputariam o MESMO valor se o UNIQUE fosse global. Em vez disso,
--     índice único PARCIAL (lookup_key) WHERE active — só a linha vigente
--     "possui" a lookup_key; a rotação deve limpar lookup_key=NULL na linha
--     antiga antes/junto de inserir a nova (documentar essa regra no
--     use-case de rotação, ela é fácil de esquecer).
--   - Índice único PARCIAL (plan_id, interval) WHERE active: só um preço
--     VIGENTE por (plano, intervalo) por vez, mas preços antigos continuam
--     existindo como linhas inativas — necessário porque o webhook resolve
--     price->plano por stripe_price_id, inclusive para o preço arquivado de
--     uma rotação em andamento (assinantes ainda não migrados).
--   - Ambos os índices parciais exigem, na rotação: UPDATE da linha antiga
--     (active=false, lookup_key=NULL) e INSERT da linha nova (active=true)
--     na MESMA transação, nessa ordem — insert-then-deactivate colide.
CREATE TABLE "billing_plan_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL REFERENCES "billing_plans"("id") ON DELETE CASCADE,
	"interval" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"stripe_price_id" text,
	"lookup_key" text,
	"active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_plan_prices_stripe_price_id_unique" UNIQUE("stripe_price_id"),
	CONSTRAINT "billing_plan_prices_interval_check" CHECK ("interval" IN ('monthly','semiannual','annual')),
	CONSTRAINT "billing_plan_prices_amount_cents_check" CHECK ("amount_cents" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "billing_plan_prices_plan_interval_active_uq" ON "billing_plan_prices" ("plan_id", "interval") WHERE "active";
--> statement-breakpoint
CREATE UNIQUE INDEX "billing_plan_prices_lookup_key_active_uq" ON "billing_plan_prices" ("lookup_key") WHERE "active";
--> statement-breakpoint
ALTER TABLE "billing_plan_prices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Backfill idempotente: a linha "standard" (hoje único plano do catálogo)
-- ganha 1 linha em billing_plan_prices com o MESMO stripe_price_id que já
-- está em produção. WHERE NOT EXISTS torna a migration segura de re-rodar.
INSERT INTO "billing_plan_prices"
  ("plan_id", "interval", "amount_cents", "currency", "stripe_price_id", "lookup_key", "active", "last_synced_at")
SELECT
  "id", "interval", "amount_cents", "currency", "stripe_price_id", "lookup_key", "active", "last_synced_at"
FROM "billing_plans" b
WHERE NOT EXISTS (
  SELECT 1 FROM "billing_plan_prices" p WHERE p."plan_id" = b."id"
);
