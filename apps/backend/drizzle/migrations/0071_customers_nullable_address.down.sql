-- 0071 down — bloqueia rollback destrutivo: se houver cliente com number/city/state
-- NULL (ex.: importados do Ink House ainda não revisados pelo owner), voltar as
-- colunas para NOT NULL falharia ou exigiria backfill com sentinela. Preencha esses
-- clientes ou remova-os antes de reverter a 0071.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.customers
    WHERE number IS NULL OR city IS NULL OR state IS NULL
  ) THEN
    RAISE EXCEPTION 'Rollback bloqueado: existem customers com number/city/state NULL. Preencha ou remova essas linhas antes de reverter a 0071.';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "number" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "city" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "state" SET NOT NULL;
