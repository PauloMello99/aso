-- 0046 — billing_plans: campos de catálogo (description, metadata, lookup_key,
-- product_key) para sincronização com o catálogo de produtos/preços do Stripe.
-- metadata é NOT NULL com default '{}' (mesmo padrão de outros jsonb do schema);
-- as demais colunas são nullable — backfill de linhas existentes fica a cargo do
-- job de sync com o Stripe, não desta migration.
ALTER TABLE "billing_plans" ADD COLUMN "description" text;
--> statement-breakpoint
ALTER TABLE "billing_plans" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "billing_plans" ADD COLUMN "lookup_key" text;
--> statement-breakpoint
ALTER TABLE "billing_plans" ADD COLUMN "product_key" text;
