-- 0074 — dimensão `installments` (número de parcelas) na taxa de meio de
-- pagamento, nas 4 tabelas que participam do cálculo/registro de taxa:
-- org_payment_fees, org_member_payment_fees (config), transactions, services
-- (negócio). Molde: 0070_member_payment_fees (trigger de imutabilidade,
-- índice único parcial).
--
-- Decisões não óbvias:
--   (i) A chave que identifica "qual taxa vale" passa a ser composta por
--       (método, parcelas), não só método: a taxa de crédito à vista e a de
--       crédito em 6x são valores DIFERENTES, então duas linhas de config com
--       o mesmo payment_method='credit_card' e installments diferentes não
--       são duplicidade — são faixas distintas que precisam coexistir. Daí
--       org_payment_fees_org_method_uq (0009) vira
--       org_payment_fees_org_method_inst_uq incluindo installments, e o
--       índice único parcial de org_member_payment_fees (0070) ganha
--       installments no mesmo espírito.
--  (ii) installments é NOT NULL DEFAULT 1 nas tabelas de CONFIG
--       (org_payment_fees / org_member_payment_fees) porque toda linha de
--       config SEMPRE representa uma faixa concreta — "à vista" é a faixa
--       installments=1, não "ausência de parcelamento". Já em transactions e
--       services (tabelas de NEGÓCIO) a coluna é NULLABLE: NULL significa
--       "método não parcelável" (dinheiro, pix, débito, ...) OU "linha
--       gravada antes da 0074", quando essa dimensão nem existia ainda —
--       forçar 1 num lançamento legado inventaria um dado que nunca foi
--       coletado.
-- (iii) O .down.sql desta migration DELETA linhas com installments > 1 de
--       org_payment_fees / org_member_payment_fees antes de restaurar as
--       constraints originais de coluna única. Isso é seguro e não fere
--       ADR-0010 (caixa append-only): essas são linhas de CONFIGURAÇÃO de
--       taxa, não lançamentos de caixa — nenhuma linha de transactions ou
--       services é alterada, apagada ou reescrita pelo rollback. É a mesma
--       distinção que já existe no restante do domínio entre "config"
--       (mutável/versionável) e "lançamento" (append-only).
--  (iv) installments entra no corpo de
--       protect_member_payment_fee_immutable_fields() pelo mesmo motivo que
--       payment_method já está lá: installments passa a ser parte da
--       IDENTIDADE da linha de config (qual faixa aquela taxa representa).
--       Permitir UPDATE de installments numa linha histórica seria migrar em
--       silêncio uma taxa já vigente/gravada para outra faixa, quebrando a
--       garantia já documentada na 0070 de que correção é sempre
--       desativar+inserir nova linha (supersede), nunca mutação de uma linha
--       existente.

-- org_payment_fees (config da ORG) --------------------------------------
ALTER TABLE "public"."org_payment_fees" ADD COLUMN "installments" smallint NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "public"."org_payment_fees" ADD CONSTRAINT "org_payment_fees_installments_check" CHECK ("installments" >= 1 AND "installments" <= 24 AND ("installments" = 1 OR "payment_method" = 'credit_card'));
--> statement-breakpoint
ALTER TABLE "public"."org_payment_fees" DROP CONSTRAINT "org_payment_fees_org_method_uq";
--> statement-breakpoint
ALTER TABLE "public"."org_payment_fees" ADD CONSTRAINT "org_payment_fees_org_method_inst_uq" UNIQUE ("org_id", "payment_method", "installments");
--> statement-breakpoint

-- org_member_payment_fees (config POR MEMBRO, 0070) ----------------------
ALTER TABLE "public"."org_member_payment_fees" ADD COLUMN "installments" smallint NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "public"."org_member_payment_fees" ADD CONSTRAINT "org_member_payment_fees_installments_check" CHECK ("installments" >= 1 AND "installments" <= 24 AND ("installments" = 1 OR "payment_method" = 'credit_card'));
--> statement-breakpoint
DROP INDEX "org_member_payment_fees_org_user_method_active_uq";
--> statement-breakpoint
CREATE UNIQUE INDEX "org_member_payment_fees_org_user_method_inst_active_uq" ON "public"."org_member_payment_fees" ("org_id", "user_id", "payment_method", "installments") WHERE "active";
--> statement-breakpoint

-- Corpo idêntico ao da 0070, só com a linha de installments acrescentada
-- (installments é parte da identidade da linha — ver (iv) acima). Trigger
-- NÃO é recriado: já referencia esta função por nome, CREATE OR REPLACE
-- propaga o novo corpo automaticamente.
CREATE OR REPLACE FUNCTION public.protect_member_payment_fee_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  NEW.percent := OLD.percent;
  NEW.fixed_cents := OLD.fixed_cents;
  NEW.payment_method := OLD.payment_method;
  NEW.installments := OLD.installments;
  NEW.org_id := OLD.org_id;
  NEW.user_id := OLD.user_id;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

-- transactions -------------------------------------------------------------
ALTER TABLE "public"."transactions" ADD COLUMN "installments" smallint;
--> statement-breakpoint
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_installments_check" CHECK ("installments" IS NULL OR ("payment_method" = 'credit_card' AND "installments" >= 1 AND "installments" <= 24));
--> statement-breakpoint

-- services -------------------------------------------------------------
-- protect_service_commission_columns() (0051) só guarda as colunas
-- commission_* — não referencia installments, então esta coluna nova não é
-- bloqueada pelo trigger de imutabilidade de comissão (confirmado lendo o
-- corpo da função na 0051 antes de escrever esta migration).
ALTER TABLE "public"."services" ADD COLUMN "installments" smallint;
--> statement-breakpoint
ALTER TABLE "public"."services" ADD CONSTRAINT "services_installments_check" CHECK ("installments" IS NULL OR ("payment_method" = 'credit_card' AND "installments" >= 1 AND "installments" <= 24));
