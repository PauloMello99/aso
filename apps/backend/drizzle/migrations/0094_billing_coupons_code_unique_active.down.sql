-- Reverte a 0094: volta ao UNIQUE(code) global da 0047.
-- ATENÇÃO: FALHA se já existir o mesmo código em mais de uma linha (ex.: um cupom
-- ativo e um inativo/arquivado com o mesmo código, o que a 0094 permite). Antes de
-- reverter, drene ou renomeie o código das linhas históricas duplicadas, p. ex.:
--   SELECT "code", count(*) FROM "billing_coupons"
--    WHERE "code" IS NOT NULL GROUP BY "code" HAVING count(*) > 1;
DROP INDEX IF EXISTS "billing_coupons_code_active_unique";
--> statement-breakpoint
ALTER TABLE "billing_coupons"
  ADD CONSTRAINT "billing_coupons_code_unique" UNIQUE ("code");
