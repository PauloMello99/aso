-- 0030 — M10b: link público de anamnese sem login (respostas de formulário).
-- anamnesis_responses é AUTOCONTIDA por design: questions_snapshot copia as perguntas
-- da versão vigente NO MOMENTO DO ENVIO. Isso é o que permite manter
-- anamnesis_forms.service_type_id com ON DELETE CASCADE (decisão já tomada): excluir um
-- tipo de serviço apaga form/versões, mas a resposta sobrevive com o snapshot embutido.
-- form_version_id na resposta é só proveniência (ON DELETE SET NULL), não é a fonte de
-- verdade das perguntas depois de enviada.
DO $$ BEGIN
  CREATE TYPE "anamnesis_response_status" AS ENUM ('pending', 'submitted');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "anamnesis_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "form_version_id" uuid REFERENCES "anamnesis_form_versions"("id") ON DELETE SET NULL,
  "service_type_id" uuid REFERENCES "service_types"("id") ON DELETE SET NULL,
  "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
  "questions_snapshot" jsonb NOT NULL,
  "token" text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  "expires_at" timestamptz NOT NULL DEFAULT now() + interval '7 days',
  "status" "anamnesis_response_status" NOT NULL DEFAULT 'pending',
  "answers" jsonb,
  "submitted_at" timestamptz,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "anamnesis_response_id" uuid REFERENCES "anamnesis_responses"("id") ON DELETE SET NULL;
--> statement-breakpoint
-- Índice único PARCIAL: só uma linha de services pode referenciar cada resposta, mas
-- múltiplas linhas com NULL são permitidas (nem todo serviço exige ficha).
CREATE UNIQUE INDEX IF NOT EXISTS "services_anamnesis_response_id_unique" ON "services" ("anamnesis_response_id") WHERE "anamnesis_response_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE public.anamnesis_responses ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- RLS POLICIES — anamnesis_responses
-- Member-level (não owner-level): enviar o convite/registrar a resposta é ação
-- operacional cotidiana, diferente de configurar o formulário em si (owner-only, M10a).
CREATE POLICY "anamnesis_responses_select" ON public.anamnesis_responses
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "anamnesis_responses_insert" ON public.anamnesis_responses
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
-- SEM UPDATE, SEM DELETE (intencional): dado de saúde é append-only por natureza. A
-- única mutação pós-insert é markSubmitted, que roda sempre via DRIZZLE_ADMIN — nunca
-- por um usuário autenticado comum (o preenchimento é feito por link público sem
-- sessão) — então não precisa de policy de UPDATE nenhuma.
