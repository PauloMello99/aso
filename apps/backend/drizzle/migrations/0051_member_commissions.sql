-- 0051 — comissão/repasse por profissional.
--
-- Decisões não óbvias:
--   (a) Índice único PARCIAL (org_id, user_id) WHERE active: só uma config
--       de comissão VIGENTE por profissional por vez. Trocar o percentual
--       não faz UPDATE — insere uma linha nova (active=true) e marca a
--       antiga active=false/superseded_at=now(), preservando histórico
--       íntegro (mesmo padrão de billing_plan_prices, migration 0048). O
--       índice NÃO é deferível: o repositório de `supersede` DEVE marcar a
--       linha antiga active=false ANTES de inserir a nova, mesmo dentro da
--       mesma transação, senão a unicidade é violada no meio da transação.
--       Já era a intenção original — deixando explícito para quem for
--       implementar o repositório.
--   (b) Ausência deliberada de policy de DELETE: sem policy, RLS já bloqueia
--       DELETE (mesmo padrão de anamnesis_form_versions — sem UPDATE/DELETE
--       nessa tabela). Correção de comissão é sempre "nova linha vigente",
--       nunca remoção da antiga.
--   (c) services.commission_* é um SNAPSHOT desnormalizado, congelado no
--       momento do atendimento. commission_config_id é só auditoria (aponta
--       pra linha de org_member_commissions que originou o snapshot) — NUNCA
--       é lido para cálculo, porque a config apontada pode ter sido
--       superseded depois; o snapshot é a única fonte de verdade para
--       pagamento de comissão já realizado.
--   (d) protect_commission_config_immutable_fields() (abaixo) permanece com
--       clamp SILENCIOSO (não RAISE) e INCONDICIONAL (nem super_admin
--       escapa) — diferente do trigger de services (que agora usa RAISE).
--       Motivo: aqui não existe caminho legítimo de "corrigir"
--       percent/mode de uma linha histórica (a correção é sempre
--       desativar+inserir nova via supersede), então não há caso de uso a
--       distinguir; qualquer tentativa de UPDATE direto nesses campos é
--       sempre bug ou tentativa indevida, e o clamp silencioso é aceitável
--       porque não há ambiguidade a resolver.
CREATE TABLE "org_member_commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"user_id" uuid NOT NULL,
	"percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"mode" text DEFAULT 'gross' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"superseded_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_member_commissions_percent_check" CHECK ("percent" >= 0 AND "percent" <= 100),
	CONSTRAINT "org_member_commissions_mode_check" CHECK ("mode" IN ('gross','net')),
	CONSTRAINT "org_member_commissions_active_superseded_check" CHECK (("active" AND "superseded_at" IS NULL) OR (NOT "active" AND "superseded_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "org_member_commissions_org_user_active_uq" ON "org_member_commissions" ("org_id", "user_id") WHERE "active";
--> statement-breakpoint
CREATE INDEX "org_member_commissions_org_idx" ON "org_member_commissions" ("org_id");
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "commission_config_id" uuid;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "commission_percent" numeric(5, 2);
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "commission_mode" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "commission_base_cents" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "commission_cents" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_commission_config_id_org_member_commissions_id_fk" FOREIGN KEY ("commission_config_id") REFERENCES "public"."org_member_commissions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE public.org_member_commissions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "org_member_commissions_select" ON public.org_member_commissions
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "org_member_commissions_insert" ON public.org_member_commissions
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));
--> statement-breakpoint
CREATE POLICY "org_member_commissions_update" ON public.org_member_commissions
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_owner(org_id))
  WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));
--> statement-breakpoint

-- Defesa em profundidade (mesmo padrão da 0041): RLS já é a proteção
-- primária, mas a Data API do Supabase concede GRANT por padrão a
-- anon/authenticated — reduzir a superfície é barato.
REVOKE ALL ON public.org_member_commissions FROM anon, authenticated;
--> statement-breakpoint

-- FIX HIGH-2 — org_member_commissions_update permite ao owner reescrever
-- percent/mode/org_id/user_id/created_by/created_at de uma linha JÁ
-- EXISTENTE (inclusive linha histórica apontada por services.commission_
-- config_id via auditoria), quebrando a garantia "nunca UPDATE de
-- percent/mode, só desativar+inserir nova" documentada no cabeçalho desta
-- migration. Trigger incondicional (sem bypass, nem para super_admin — essa
-- invariante não tem exceção): só active/superseded_at/updated_at podem
-- mudar num UPDATE.
CREATE OR REPLACE FUNCTION public.protect_commission_config_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  NEW.percent := OLD.percent;
  NEW.mode := OLD.mode;
  NEW.org_id := OLD.org_id;
  NEW.user_id := OLD.user_id;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER org_member_commissions_protect_immutable
  BEFORE UPDATE ON public.org_member_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_commission_config_immutable_fields();
--> statement-breakpoint

-- FIX HIGH-1 — services.commission_* é um snapshot que deve ficar imutável
-- depois de pago (comentário (c) no topo desta migration), mas a policy
-- services_update (0000_magenta_swarm.sql) permite UPDATE livre por
-- qualquer membro da org em QUALQUER coluna do serviço, incluindo as 5
-- colunas de comissão — sem trilha nenhuma.
--
-- Guard no padrão vetted da 0041 (não o denylist da 0039/0041.down, que
-- tem furo: conexões via PostgREST/Data API chegam como
-- session_user='authenticator' com SET ROLE authenticated/anon, nem
-- 'app_user' nem 'postgres', passando pelo clamp sem proteção alguma).
-- Aqui: SECURITY INVOKER (current_user reflete quem executa de fato) +
-- bypass explícito por atributo de role (rolsuper/rolbypassrls via
-- pg_roles, cobrindo DRIZZLE_ADMIN/service_role) OU is_super_admin().
--
-- FIX HIGH (2ª rodada) — o desenho anterior usava um gate de "primeira
-- gravação" (bloquear só se OLD já tinha commission_config_id/percent) e
-- clampava tudo em silêncio depois disso, inclusive para o owner. Isso
-- quebrava CorrectServicePaymentUseCase (owner-only via OrgOwnerGuard, roda
-- como app_user comum via DRIZZLE, não super_admin), que precisa recalcular
-- a comissão de um serviço JÁ pago. Reescrito assim:
--   (1) IF OLD.payment_transaction_id IS NULL THEN RETURN NEW — antes do
--       primeiro pagamento o snapshot ainda não está "congelado"; qualquer
--       escrita nele é normal, é assim que o pagamento inicial grava a
--       comissão pela primeira vez.
--   (2) Depois de pago, só owner da org (is_org_owner) ou role privilegiada
--       (super_admin/bypassrls) pode alterar essas 5 colunas — exatamente o
--       caminho de CorrectServicePaymentUseCase.
--   (3) Qualquer outra tentativa de alterar o snapshot pós-pagamento agora
--       FALHA COM EXCEÇÃO (RAISE), não mais clamp silencioso — um clamp
--       silencioso mascara bug.
--   (4) O trigger passou a cobrir também INSERT: fecha o furo de um membro
--       comum (não-owner) semear um snapshot de comissão arbitrário na
--       criação do serviço. Serviços normalmente nascem sem comissão
--       (colunas NULL/0), então isso não afeta o fluxo normal de criação
--       por qualquer membro.
CREATE OR REPLACE FUNCTION public.protect_service_commission_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF public.is_super_admin() OR EXISTS (
    SELECT 1 FROM pg_roles r WHERE r.rolname = current_user AND (r.rolsuper OR r.rolbypassrls)
  ) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF public.is_org_owner(NEW.org_id) THEN
      RETURN NEW;
    END IF;
    IF NEW.commission_config_id IS NOT NULL
       OR NEW.commission_percent IS NOT NULL
       OR NEW.commission_mode IS NOT NULL
       OR NEW.commission_base_cents <> 0
       OR NEW.commission_cents <> 0 THEN
      RAISE EXCEPTION 'commission snapshot cannot be set on insert by a non-owner member';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.payment_transaction_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_org_owner(OLD.org_id) THEN
    RETURN NEW;
  END IF;

  IF NEW.commission_config_id IS DISTINCT FROM OLD.commission_config_id
     OR NEW.commission_percent IS DISTINCT FROM OLD.commission_percent
     OR NEW.commission_mode IS DISTINCT FROM OLD.commission_mode
     OR NEW.commission_base_cents IS DISTINCT FROM OLD.commission_base_cents
     OR NEW.commission_cents IS DISTINCT FROM OLD.commission_cents THEN
    RAISE EXCEPTION 'commission snapshot is immutable once the service is paid';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS services_protect_commission_columns ON public.services;
--> statement-breakpoint
CREATE TRIGGER services_protect_commission_columns
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_service_commission_columns();
