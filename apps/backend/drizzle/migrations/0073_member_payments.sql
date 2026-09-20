-- 0072 — pagamento real a membro (profissional/funcionário): vínculo entre uma
-- transação de caixa (outcome) e o membro beneficiário. ADR-0026.
--
-- Molde: 0070_member_payment_fees (RLS org-wide SELECT / owner-only INSERT,
-- REVOKE de anon/authenticated, trigger BEFORE UPDATE), mas com decisões de
-- modelagem DIFERENTES — ver abaixo.
--
-- Decisões não óbvias:
--   (i) Padrão LEDGER (como `transactions`), NÃO padrão CONFIG (0051/0070):
--       ADR-0026 §3 decide explicitamente que o registro de pagamento é
--       APPEND-ONLY, espelhando o caixa (ADR-0010) — sem `active`/
--       `superseded_at`. "Estornado" é DERIVADO: existe uma linha de
--       reversão (`reverses_payment_id`) apontando para a original; nunca um
--       campo mutável na linha original. O motivo (ADR-0026 §3): duas
--       semânticas de correção diferentes no mesmo fluxo de dinheiro
--       (config-style aqui, ledger-style no caixa) é exatamente o tipo de
--       inconsistência que o ADR-0010 existe para evitar.
--   (ii) `transaction_id` é NOT NULL + UNIQUE: ADR-0026 §4 fecha que "não
--        existe alteração de pagamento que fique só na entidade de pagamento
--        sem eco no caixa" — toda linha de `org_member_payments` DEVE
--        corresponder a exatamente uma transação de caixa (outcome), e toda
--        transação de pagamento a membro tem no máximo um registro. A
--        unicidade em banco garante 1:1 mesmo se o use-case tiver um bug —
--        não é só uma FK, é uma garantia estrutural do eco obrigatório.
--   (iii) Índice único PARCIAL em `reverses_payment_id WHERE NOT NULL`: mais
--         forte que o padrão equivalente do caixa. Lá (`transactions
--         .reverses_transaction_id`, 0009) a proteção contra duplo estorno é
--         só um índice COMUM + validação em código no use-case. Aqui,
--         ADR-0026 pede explicitamente uma segunda camada — 409 na aplicação
--         E constraint de banco — porque o pagamento não tem o histórico de
--         revisão que o caixa tem; a unicidade em banco fecha a lacuna sem
--         depender só do use-case. Desvio deliberado do precedente do caixa,
--         registrado aqui para o database-guardian confirmar.
--
-- Valores SEMPRE positivos (inclusive no estorno) — compensação é por
-- EXCLUSÃO na query do saldo (linhas revertidas não entram na soma), nunca
-- por sinal negativo (ADR-0026, "Decisões de modelagem").
--
-- `user_id` (beneficiário) sem FK, mesmo padrão de
-- `org_member_payment_fees.user_id` (0070): membro é linha em `users`/
-- `org_members`, não uma entidade própria do módulo.
--
-- Nota sobre exclusão de organização: `transactions` e `org_member_payments`
-- são removidos pela MESMA cascata de `organizations` (ambas têm `org_id`
-- com `ON DELETE CASCADE` — ver `transactions_org_id_organizations_id_fk` na
-- 0000) — por isso o `ON DELETE RESTRICT` de `transaction_id`/
-- `reverses_payment_id` abaixo não bloqueia essa cascata.
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_id_org_id_uq" UNIQUE ("id", "org_id");
--> statement-breakpoint
CREATE TABLE "public"."org_member_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
	"user_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"period_start" date,
	"period_end" date,
	"description" text,
	"reverses_payment_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_member_payments_amount_cents_check" CHECK ("amount_cents" > 0),
	CONSTRAINT "org_member_payments_period_check" CHECK ("period_start" IS NULL OR "period_end" IS NULL OR "period_start" <= "period_end"),
	CONSTRAINT "org_member_payments_reverses_not_self_check" CHECK ("reverses_payment_id" IS NULL OR "reverses_payment_id" <> "id"),
	-- Endurecimento cross-tenant (database-guardian, achado medium): sem FK
	-- composta, nada impede transaction_id/reverses_payment_id apontarem para
	-- uma linha de OUTRA organização. Espelha customers_id_org_id_uq (0052).
	CONSTRAINT "org_member_payments_id_org_id_uq" UNIQUE ("id", "org_id"),
	CONSTRAINT "org_member_payments_transaction_org_fk" FOREIGN KEY ("transaction_id", "org_id") REFERENCES "public"."transactions" ("id", "org_id") ON DELETE RESTRICT,
	CONSTRAINT "org_member_payments_reverses_org_fk" FOREIGN KEY ("reverses_payment_id", "org_id") REFERENCES "public"."org_member_payments" ("id", "org_id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE UNIQUE INDEX "org_member_payments_transaction_uq" ON "public"."org_member_payments" ("transaction_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "org_member_payments_reverses_uq" ON "public"."org_member_payments" ("reverses_payment_id") WHERE "reverses_payment_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "org_member_payments_org_user_idx" ON "public"."org_member_payments" ("org_id", "user_id");
--> statement-breakpoint

ALTER TABLE public.org_member_payments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- SELECT é org-wide (não escopado por beneficiário): a restrição "funcionário
-- só vê a própria linha" é camada de aplicação (resolveActor, mesmo padrão de
-- get-balance/list-transactions/GetMemberCommissionsUseCase), não RLS —
-- mesma decisão de design de org_member_payment_fees/org_member_commissions.
CREATE POLICY "org_member_payments_select" ON public.org_member_payments
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "org_member_payments_insert" ON public.org_member_payments
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));
--> statement-breakpoint

-- Ausência DELIBERADA de policy de UPDATE e de DELETE: sem policy, RLS já
-- nega os dois. Diferente da 0070 (que tem policy de UPDATE para trocar
-- active/superseded_at), aqui não existe UPDATE legítimo algum — correção é
-- sempre uma NOVA linha (reverses_payment_id), nunca mutação da existente.
--
-- Defesa em profundidade (mesmo padrão da 0051/0070): RLS já é a proteção
-- primária, mas a Data API do Supabase concede GRANT por padrão a
-- anon/authenticated — reduzir a superfície é barato.
REVOKE ALL ON public.org_member_payments FROM anon, authenticated;
--> statement-breakpoint

-- Diferente de protect_member_payment_fee_immutable_fields() (0070), que faz
-- clamp SILENCIOSO de campos específicos (porque active/superseded_at PODEM
-- mudar legitimamente ali), esta função REJEITA qualquer UPDATE por completo
-- — nenhum campo desta tabela pode mudar depois de inserido, nem para
-- super_admin (sem exceção, mesmo padrão incondicional da 0070). Correção é
-- sempre um novo INSERT com reverses_payment_id apontando para a linha
-- original.
CREATE OR REPLACE FUNCTION public.reject_org_member_payments_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RAISE EXCEPTION 'org_member_payments é append-only: UPDATE não é permitido (linha id=%). Correção é um novo INSERT com reverses_payment_id.', OLD.id;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER org_member_payments_reject_update
  BEFORE UPDATE ON public.org_member_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_org_member_payments_update();
