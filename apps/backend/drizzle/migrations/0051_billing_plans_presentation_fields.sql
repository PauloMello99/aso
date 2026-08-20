-- 0051 — billing_plans: campos de apresentação (highlighted, features) editados
-- só por super_admin via PATCH /admin/billing/plans/:key/product, para os cards
-- de pricing da landing. NÃO fazem parte de PLAN_CATALOG (seed) e NÃO são
-- tocados pelo sync/reconcile/webhook do Stripe — ver domain-rules.md.
ALTER TABLE "billing_plans" ADD COLUMN "highlighted" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "billing_plans" ADD COLUMN "features" jsonb DEFAULT '[]'::jsonb NOT NULL;
