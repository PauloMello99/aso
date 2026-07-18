-- 0033 — M11a: billing Stripe (assinaturas pagas, catálogo de planos, cortesias/comp e
-- idempotência de webhook). Estende "subscriptions" com os campos necessários para
-- refletir preço/cupom do Stripe e para conceder cortesia administrativa (comp) sem
-- depender do Stripe. Cria 3 tabelas novas:
--   - stripe_webhook_events: dedupe de webhook (event.id como PK, sem default — é o
--     id que o Stripe manda). Tabela puramente operacional/interna, sem conceito de
--     organização — não faz sentido nenhuma policy de RLS aqui; RLS habilitado apenas
--     para bloquear por padrão qualquer role sujeita a RLS (authenticated/anon), só
--     DRIZZLE_ADMIN (bypassa RLS) deve gravar/ler.
--   - billing_plans: catálogo administrado de planos (preço/nome/produto Stripe).
--     RLS habilitado sem policy por enquanto (mesmo raciocínio) — é escrito só por
--     super_admin via DRIZZLE_ADMIN. Se o frontend precisar exibir preço de plano
--     diretamente via RLS (não via endpoint do backend), será necessária uma policy
--     de SELECT público nesta tabela; deixado como ponto em aberto, ver retorno do
--     agente que gerou esta migration.
--   - billing_invoice_events: espelho administrativo de eventos de fatura do Stripe
--     (paid/payment_failed), sem FK obrigatória para organizations (o webhook pode
--     chegar antes/depois de a org existir no nosso banco, ou a fatura pode não
--     mapear 1:1 com org_id local). RLS habilitado sem policy pelo mesmo raciocínio.
CREATE TYPE "public"."billing_invoice_event_type" AS ENUM('paid', 'payment_failed');
--> statement-breakpoint

ALTER TABLE "subscriptions" ADD COLUMN "stripe_price_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_coupon_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "discount_percent" smallint;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "comp_reason" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "comp_granted_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "comp_expires_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_consumed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

CREATE TABLE "stripe_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
-- Sem organização/RLS relevante: dedupe interno de webhook, só DRIZZLE_ADMIN acessa.
-- ENABLE ROW LEVEL SECURITY sem nenhuma policy bloqueia por padrão qualquer role
-- sujeita a RLS (authenticated/anon); a conexão admin (bypassrls) segue funcionando.
ALTER TABLE "stripe_webhook_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE "billing_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"stripe_product_id" text,
	"stripe_price_id" text,
	"name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"interval" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_plans_key_unique" UNIQUE("key")
);
--> statement-breakpoint
-- Catálogo administrado só por super_admin/DRIZZLE_ADMIN. Sem policy de leitura
-- pública por ora — ver observação no cabeçalho sobre exibição de preço no frontend.
ALTER TABLE "billing_plans" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE "billing_invoice_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_invoice_id" text NOT NULL,
	"org_id" uuid,
	"type" "billing_invoice_event_type" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_invoice_events_invoice_type_uq" UNIQUE("stripe_invoice_id","type")
);
--> statement-breakpoint
-- Espelho administrativo de eventos de fatura; sem policy de leitura via RLS por ora
-- — admin-panel deve ler via DRIZZLE_ADMIN, não via RLS direto do app_user.
ALTER TABLE "billing_invoice_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- BACKFILL — toda organização sem linha em subscriptions ganha uma. A org do owner
-- (Ink House, slug 'nokafolqpwcvwqdkuwux') recebe cortesia perpétua (custom/active,
-- price_cents=0, sem comp_expires_at); as demais entram como free/canceled (locked),
-- consistente com o gate de billing que ainda vai ser implementado nos próximos passos.
INSERT INTO "subscriptions"
  ("org_id", "type", "status", "price_cents", "comp_reason", "comp_expires_at", "grace_period_days", "trial_consumed", "created_at", "updated_at")
SELECT
  o."id",
  'custom',
  'active',
  0,
  'Organização do owner — isenção perpétua concedida no backfill de billing (M11)',
  NULL,
  14,
  false,
  now(),
  now()
FROM "organizations" o
LEFT JOIN "subscriptions" s ON s."org_id" = o."id"
WHERE s."id" IS NULL
  AND o."slug" = 'nokafolqpwcvwqdkuwux';
--> statement-breakpoint

INSERT INTO "subscriptions"
  ("org_id", "type", "status", "grace_period_days", "trial_consumed", "created_at", "updated_at")
SELECT
  o."id",
  'free',
  'canceled',
  14,
  false,
  now(),
  now()
FROM "organizations" o
LEFT JOIN "subscriptions" s ON s."org_id" = o."id"
WHERE s."id" IS NULL
  AND o."slug" <> 'nokafolqpwcvwqdkuwux';
