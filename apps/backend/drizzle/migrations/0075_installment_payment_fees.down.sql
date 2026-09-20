-- Reverte 0074.
--
-- ATENÇÃO — perda de dado: linhas de CONFIG de taxa com installments > 1 são
-- DELETADAS (sem filtro de active — inclui superseded) antes de restaurar as
-- constraints de coluna única originais (senão a restauração falha por
-- duplicidade: duas faixas de crédito coexistindo violam a chave antiga de
-- "um por método"). Isso é seguro em relação a ADR-0010 (caixa append-only):
-- são linhas de configuração de taxa, não lançamentos. Nenhum snapshot
-- (fee_percent/fee_fixed_cents/fee_source) é alterado e NENHUMA linha de
-- transactions/services é apagada. O único efeito colateral em transactions
-- é o ON DELETE SET NULL do FK transactions.fee_config_id (0070) zerando o
-- ponteiro de AUDITORIA das linhas que apontavam pra uma config >1x
-- deletada — inofensivo por 0070 item (c): fee_config_id nunca é lido para
-- cálculo, só o snapshot já congelado. A coluna installments em si (a
-- contagem de parcelas do lançamento/serviço) é perdida com o DROP COLUMN
-- mais abaixo, como em qualquer rollback de coluna.

-- 1) services / transactions: CHECKs e colunas de negócio primeiro.
ALTER TABLE "public"."services" DROP CONSTRAINT IF EXISTS "services_installments_check";
--> statement-breakpoint
ALTER TABLE "public"."services" DROP COLUMN IF EXISTS "installments";
--> statement-breakpoint

ALTER TABLE "public"."transactions" DROP CONSTRAINT IF EXISTS "transactions_installments_check";
--> statement-breakpoint
ALTER TABLE "public"."transactions" DROP COLUMN IF EXISTS "installments";
--> statement-breakpoint

-- 2) Trigger/função de volta ao corpo EXATO original da 0070 (sem a linha
-- de installments). Trigger não é recriado (CREATE OR REPLACE propaga).
CREATE OR REPLACE FUNCTION public.protect_member_payment_fee_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  NEW.percent := OLD.percent;
  NEW.fixed_cents := OLD.fixed_cents;
  NEW.payment_method := OLD.payment_method;
  NEW.org_id := OLD.org_id;
  NEW.user_id := OLD.user_id;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

-- 3) Limpa faixas > 1x ANTES de restaurar as constraints de coluna única
-- originais (senão a restauração falha por duplicidade nas chaves antigas).
DELETE FROM "public"."org_member_payment_fees" WHERE "installments" > 1;
--> statement-breakpoint
DELETE FROM "public"."org_payment_fees" WHERE "installments" > 1;
--> statement-breakpoint

-- 4) Restaura o índice parcial e o UNIQUE originais.
DROP INDEX IF EXISTS "org_member_payment_fees_org_user_method_inst_active_uq";
--> statement-breakpoint
CREATE UNIQUE INDEX "org_member_payment_fees_org_user_method_active_uq" ON "public"."org_member_payment_fees" ("org_id", "user_id", "payment_method") WHERE "active";
--> statement-breakpoint

ALTER TABLE "public"."org_payment_fees" DROP CONSTRAINT IF EXISTS "org_payment_fees_org_method_inst_uq";
--> statement-breakpoint
ALTER TABLE "public"."org_payment_fees" ADD CONSTRAINT "org_payment_fees_org_method_uq" UNIQUE ("org_id", "payment_method");
--> statement-breakpoint

-- 5) Drop das colunas installments das duas tabelas de config.
ALTER TABLE "public"."org_member_payment_fees" DROP CONSTRAINT IF EXISTS "org_member_payment_fees_installments_check";
--> statement-breakpoint
ALTER TABLE "public"."org_member_payment_fees" DROP COLUMN IF EXISTS "installments";
--> statement-breakpoint

ALTER TABLE "public"."org_payment_fees" DROP CONSTRAINT IF EXISTS "org_payment_fees_installments_check";
--> statement-breakpoint
ALTER TABLE "public"."org_payment_fees" DROP COLUMN IF EXISTS "installments";
