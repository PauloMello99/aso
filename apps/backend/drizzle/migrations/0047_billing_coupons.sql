-- 0047 — módulo financeiro (super_admin): catálogo de cupons de desconto do Stripe.
-- billing_coupons espelha Coupon + Promotion Code do Stripe (Coupon é imutável após
-- criado — só name/metadata mudariam; o que de fato é editável é o Promotion Code:
-- active/expires_at/max_redemptions/times_redeemed). Mesma classe de billing_plans:
-- catálogo global (sem organization_id), administrado só por super_admin via
-- DRIZZLE_ADMIN. RLS habilitado sem nenhuma policy — bloqueia por padrão qualquer
-- role sujeita a RLS (authenticated/anon); a conexão admin (bypassrls) segue
-- funcionando normalmente.
--
-- Regras de negócio deliberadas (revisão database-guardian):
--   - UNIQUE(stripe_coupon_id): a plataforma sempre cria Coupon + Promotion Code
--     juntos (1:1) — nunca dois Promotion Codes para o mesmo Coupon. Se essa regra
--     mudar no futuro, remover este UNIQUE numa migration própria.
--   - percent_off é INTEGER (1-100): a plataforma só cria cupons com percentual
--     inteiro. Coupons fracionários (ex. 33.33%) criados direto no Dashboard do
--     Stripe não são suportados pela sincronização reversa — o handler do webhook
--     deve REJEITAR/ignorar (nunca truncar silenciosamente) um coupon.percent_off
--     não-inteiro vindo do Stripe.
--   - code (case-sensitive aqui) é normalizado para UPPERCASE na camada de
--     aplicação antes de gravar — evita colisão com a validação case-insensitive
--     do Stripe na hora do resgate.
CREATE TABLE "billing_coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_coupon_id" text NOT NULL,
	"stripe_promotion_code_id" text,
	"code" text,
	"name" text NOT NULL,
	"percent_off" integer,
	"amount_off_cents" integer,
	"currency" text,
	"duration" text NOT NULL,
	"duration_in_months" integer,
	"max_redemptions" integer,
	"times_redeemed" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_coupons_stripe_coupon_id_unique" UNIQUE("stripe_coupon_id"),
	CONSTRAINT "billing_coupons_stripe_promotion_code_id_unique" UNIQUE("stripe_promotion_code_id"),
	CONSTRAINT "billing_coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "billing_coupons" ENABLE ROW LEVEL SECURITY;
