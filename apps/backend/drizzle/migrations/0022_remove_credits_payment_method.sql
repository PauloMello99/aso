-- 0022 — remove 'credits' do enum payment_method (B7): feature de cashback nunca foi lancada, sem dado historico usando esse valor (confirmado em staging).
ALTER TYPE "public"."payment_method" RENAME TO "payment_method_old";
--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'bank_transfer', 'credit_card', 'debit_card');
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "payment_method" TYPE "public"."payment_method" USING "payment_method"::text::"public"."payment_method";
--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "payment_method" TYPE "public"."payment_method" USING "payment_method"::text::"public"."payment_method";
--> statement-breakpoint
ALTER TABLE "org_payment_fees" ALTER COLUMN "payment_method" TYPE "public"."payment_method" USING "payment_method"::text::"public"."payment_method";
--> statement-breakpoint
DROP TYPE "public"."payment_method_old";
