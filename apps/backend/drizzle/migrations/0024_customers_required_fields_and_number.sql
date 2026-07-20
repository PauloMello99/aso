-- 0024 — reset de customers (dado de teste, autorizado pelo usuario) + campos obrigatorios
-- fixos pra toda organizacao (A6): email, birth_date, address, city, state, e novo campo
-- "number" (numero do endereco, sempre manual, nunca preenchido pelo ViaCEP no frontend).
-- Reset evita backfill com sentinela (nao ha como inventar data de nascimento real).
DELETE FROM "customers";
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "number" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "email" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "birth_date" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "address" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "city" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "state" SET NOT NULL;
