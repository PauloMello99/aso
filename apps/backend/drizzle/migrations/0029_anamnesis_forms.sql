-- 0029 — M10a: ficha de anamnese (construtor de formulário + versionamento).
-- anamnesis_forms: 1 formulário por tipo de serviço (service_type_id UNIQUE).
-- anamnesis_form_versions: versões imutáveis do formulário (perguntas em jsonb);
-- org_id denormalizado pra RLS, igual ao padrão de service_media/customer_attachments.
-- Sem UPDATE/DELETE em nenhuma das duas: formulário some só em cascata (form/org
-- deletados) e versões nunca mudam depois de criadas.
CREATE TABLE IF NOT EXISTS "anamnesis_forms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "service_type_id" uuid NOT NULL REFERENCES "service_types"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "anamnesis_forms_service_type_id_unique" UNIQUE("service_type_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "anamnesis_form_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "form_id" uuid NOT NULL REFERENCES "anamnesis_forms"("id") ON DELETE CASCADE,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "version_number" integer NOT NULL,
  "questions" jsonb NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "anamnesis_form_versions_form_id_version_number_unique" UNIQUE("form_id","version_number")
);
-- Sem índice extra em (form_id): o índice do UNIQUE(form_id, version_number) acima já
-- serve buscas/ordenação por form_id (leftmost prefix) — um índice separado só
-- duplicaria manutenção de escrita sem ganho.
--> statement-breakpoint
ALTER TABLE public.anamnesis_forms ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.anamnesis_form_versions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- RLS POLICIES — anamnesis_forms
CREATE POLICY "anamnesis_forms_select" ON public.anamnesis_forms
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "anamnesis_forms_insert" ON public.anamnesis_forms
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));
--> statement-breakpoint
-- RLS POLICIES — anamnesis_form_versions (imutável: sem UPDATE, sem DELETE)
CREATE POLICY "anamnesis_form_versions_select" ON public.anamnesis_form_versions
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "anamnesis_form_versions_insert" ON public.anamnesis_form_versions
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));
