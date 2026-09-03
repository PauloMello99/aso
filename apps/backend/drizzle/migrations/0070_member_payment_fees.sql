-- 0070 — taxa de meio de pagamento POR FUNCIONÁRIO (override sobre a taxa da org).
--
-- Molde: 0051_member_commissions (versionamento active/superseded imutável,
-- índice único parcial WHERE active, RLS owner-write, trigger de proteção de
-- campos imutáveis, snapshot desnormalizado na linha de negócio).
--
-- Decisões não óbvias:
--   (a) Índice único PARCIAL (org_id, user_id, payment_method) WHERE active:
--       só uma config de taxa VIGENTE por (funcionário, método) por vez.
--       Trocar percent/fixed_cents NÃO faz UPDATE — insere linha nova
--       (active=true) e marca a antiga active=false / superseded_at=now(),
--       preservando histórico íntegro (mesmo padrão de org_member_commissions,
--       0051). O índice NÃO é deferível: o repositório DEVE desativar a linha
--       antiga (active=false, superseded_at=now()) ANTES de inserir a nova,
--       mesmo dentro da MESMA transação, senão a unicidade parcial é violada
--       no meio da transação. Deixando explícito para quem implementar o repo.
--   (b) Ausência DELIBERADA de policy de DELETE: sem policy, RLS já bloqueia
--       DELETE. Correção de taxa é sempre "nova linha vigente", nunca remoção
--       da antiga (mesmo padrão da 0051).
--   (c) transactions.fee_percent / fee_fixed_cents / fee_source são um
--       SNAPSHOT desnormalizado, congelado no momento do lançamento, e são a
--       ÚNICA fonte de verdade da taxa já cobrada naquela transação.
--       transactions.fee_config_id é SÓ auditoria (aponta pra linha de
--       org_member_payment_fees que originou o snapshot) — NUNCA é lido para
--       cálculo, porque a config apontada pode ter sido superseded depois.
--       Consequência: o FK fee_config_id usa ON DELETE SET NULL sem risco — se
--       a config for removida por cascade da org, some só o ponteiro de
--       auditoria; percent/fixed_cents/source do snapshot ficam intactos.
--   (d) protect_member_payment_fee_immutable_fields() (abaixo) permanece com
--       clamp SILENCIOSO (não RAISE) e INCONDICIONAL (nem super_admin escapa):
--       não existe caminho legítimo de "corrigir" percent/fixed_cents/método
--       de uma linha histórica (a correção é sempre desativar+inserir nova via
--       supersede), então não há caso de uso a distinguir — qualquer UPDATE
--       direto nesses campos é sempre bug ou tentativa indevida. Só
--       active / superseded_at / updated_at podem mudar num UPDATE.
--   (e) NÃO se cria trigger de imutabilidade nas colunas fee_* de
--       transactions (diferente do que a 0051 fez para services.commission_*),
--       DE PROPÓSITO: as policies transactions_update / transactions_delete
--       (0000_magenta_swarm.sql ~L450-454) já são USING (public.is_super_admin())
--       — super_admin-only — e nenhum caminho de código de aplicação faz UPDATE
--       em transactions: a caixa é append-only (ADR-0010), errata é
--       estorno+substituição (INSERT de nova linha). O único UPDATE possível em
--       transactions.fee_config_id é o ON DELETE SET NULL do FK, e ele é
--       inofensivo por (c). Portanto o snapshot fee_* já nasce protegido pelo
--       modelo append-only + RLS existente. Registrado aqui para o
--       database-guardian confirmar em vez de tratar como omissão.
CREATE TABLE "public"."org_member_payment_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
	"user_id" uuid NOT NULL,
	"payment_method" "public"."payment_method" NOT NULL,
	"percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"fixed_cents" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"superseded_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_member_payment_fees_percent_check" CHECK ("percent" >= 0 AND "percent" <= 100),
	CONSTRAINT "org_member_payment_fees_fixed_cents_check" CHECK ("fixed_cents" >= 0),
	CONSTRAINT "org_member_payment_fees_active_superseded_check" CHECK (("active" AND "superseded_at" IS NULL) OR (NOT "active" AND "superseded_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "org_member_payment_fees_org_user_method_active_uq" ON "public"."org_member_payment_fees" ("org_id", "user_id", "payment_method") WHERE "active";
--> statement-breakpoint
CREATE INDEX "org_member_payment_fees_org_idx" ON "public"."org_member_payment_fees" ("org_id");
--> statement-breakpoint

ALTER TABLE "public"."transactions" ADD COLUMN "fee_config_id" uuid;
--> statement-breakpoint
ALTER TABLE "public"."transactions" ADD COLUMN "fee_percent" numeric(5, 2);
--> statement-breakpoint
ALTER TABLE "public"."transactions" ADD COLUMN "fee_fixed_cents" integer;
--> statement-breakpoint
ALTER TABLE "public"."transactions" ADD COLUMN "fee_source" text;
--> statement-breakpoint

-- fee_source: 'member' = taxa do funcionário aplicada; 'org' = taxa da org
-- aplicada; 'none' = sem taxa (método não elegível OU elegível sem config).
-- NULL = linha registrada ANTES da 0070. A partir da 0070 todo INSERT em
-- transactions grava um valor não-nulo: o repositório de transações aplica
-- 'none' por omissão (inclusive nos caminhos de transferência e estorno).
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_fee_source_check" CHECK ("fee_source" IS NULL OR "fee_source" IN ('member', 'org', 'none'));
--> statement-breakpoint
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_fee_config_id_org_member_payment_fees_id_fk" FOREIGN KEY ("fee_config_id") REFERENCES "public"."org_member_payment_fees"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE public.org_member_payment_fees ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "org_member_payment_fees_select" ON public.org_member_payment_fees
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "org_member_payment_fees_insert" ON public.org_member_payment_fees
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));
--> statement-breakpoint
CREATE POLICY "org_member_payment_fees_update" ON public.org_member_payment_fees
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_owner(org_id))
  WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));
--> statement-breakpoint

-- Defesa em profundidade (mesmo padrão da 0051): RLS já é a proteção primária,
-- mas a Data API do Supabase concede GRANT por padrão a anon/authenticated —
-- reduzir a superfície é barato.
REVOKE ALL ON public.org_member_payment_fees FROM anon, authenticated;
--> statement-breakpoint

-- Espelha protect_commission_config_immutable_fields() da 0051: a policy de
-- UPDATE permite ao owner reescrever percent/fixed_cents/payment_method/org_id/
-- user_id/created_by/created_at de uma linha JÁ EXISTENTE (inclusive linha
-- histórica apontada por transactions.fee_config_id via auditoria), quebrando a
-- garantia "nunca UPDATE desses campos, só desativar+inserir nova" documentada
-- no cabeçalho desta migration. Trigger incondicional (sem bypass, nem para
-- super_admin — essa invariante não tem exceção): só active / superseded_at /
-- updated_at podem mudar num UPDATE.
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
CREATE TRIGGER org_member_payment_fees_protect_immutable
  BEFORE UPDATE ON public.org_member_payment_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_member_payment_fee_immutable_fields();
