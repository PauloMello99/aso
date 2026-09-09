-- 0072 — vínculo N:N declarativo entre materiais e tipos de serviço.
--
-- Molde: 0070_member_payment_fees (RLS + REVOKE); predicado de policy
-- espelhado de public.materials (0000_magenta_swarm.sql).
--
-- Decisões não óbvias:
--   (a) O vínculo é DECLARATIVO: o usuário marca no formulário de material a
--       quais tipos de serviço aquele material costuma estar associado. Não é
--       derivado de histórico de uso real (transactions/services já lançados).
--   (b) Serve só para ORDENAR a lista de materiais no formulário de serviço
--       (materiais vinculados ao tipo de serviço selecionado aparecem primeiro),
--       NUNCA para filtrar — um material sem nenhum vínculo continua listável
--       e selecionável normalmente em qualquer serviço.
--   (c) Existe policy de DELETE (diferente de 0070, que deliberadamente não
--       tem) porque a escrita deste vínculo pela aplicação é sempre
--       "delete-all dos vínculos do material + insert do conjunto declarado
--       no formulário", não um patch incremental.
--   (d) Os UNIQUE (id, org_id) adicionados abaixo em materials/service_types
--       existem SÓ para viabilizar as FKs compostas (material_id, org_id) e
--       (service_type_id, org_id) desta tabela — a técnica clássica para
--       tornar impossível, no próprio banco, vincular material de uma org a
--       tipo de serviço de outra. NÃO podem ser dropados por migrations
--       futuras sem antes remover (ou substituir) as FKs compostas que os
--       referenciam.
CREATE TABLE "public"."material_service_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
	"material_id" uuid NOT NULL,
	"service_type_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "public"."materials" ADD CONSTRAINT "materials_id_org_uq" UNIQUE ("id", "org_id");
--> statement-breakpoint
ALTER TABLE "public"."service_types" ADD CONSTRAINT "service_types_id_org_uq" UNIQUE ("id", "org_id");
--> statement-breakpoint

ALTER TABLE "public"."material_service_types" ADD CONSTRAINT "material_service_types_material_id_org_id_fk" FOREIGN KEY ("material_id", "org_id") REFERENCES "public"."materials"("id", "org_id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "public"."material_service_types" ADD CONSTRAINT "material_service_types_service_type_id_org_id_fk" FOREIGN KEY ("service_type_id", "org_id") REFERENCES "public"."service_types"("id", "org_id") ON DELETE CASCADE;
--> statement-breakpoint

CREATE UNIQUE INDEX "material_service_types_material_type_uq" ON "public"."material_service_types" ("material_id", "service_type_id");
--> statement-breakpoint
CREATE INDEX "material_service_types_service_type_idx" ON "public"."material_service_types" ("service_type_id");
--> statement-breakpoint
CREATE INDEX "material_service_types_org_idx" ON "public"."material_service_types" ("org_id");
--> statement-breakpoint

-- Índices de apoio à busca dos endpoints /options (hoje inexistentes) usados
-- pelos formulários de material e cliente.
CREATE INDEX "materials_org_name_idx" ON "public"."materials" ("org_id", "name");
--> statement-breakpoint
CREATE INDEX "customers_org_name_idx" ON "public"."customers" ("org_id", "name");
--> statement-breakpoint

ALTER TABLE public.material_service_types ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "material_service_types_select" ON public.material_service_types
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "material_service_types_insert" ON public.material_service_types
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "material_service_types_update" ON public.material_service_types
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
-- DESVIO DELIBERADO do predicado de public.materials, cujo materials_delete é
-- owner-only: aqui DELETE não apaga material nenhum, apaga só uma linha de
-- configuração. Como a escrita é "delete-all + insert do conjunto declarado"
-- (c) e qualquer membro pode editar um material (materials_update é
-- is_org_member), restringir o DELETE a owner faria o salvamento de um membro
-- não-owner perder silenciosamente a etapa de limpeza — RLS não levanta erro
-- em DELETE sem linhas visíveis — deixando vínculos órfãos e colidindo depois
-- com o índice único. O predicado de escrita acompanha, portanto, quem pode
-- editar o material.
CREATE POLICY "material_service_types_delete" ON public.material_service_types
  FOR DELETE USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint

-- Defesa em profundidade (mesmo padrão da 0070): RLS já é a proteção
-- primária, mas a Data API do Supabase concede GRANT por padrão a
-- anon/authenticated — reduzir a superfície é barato.
REVOKE ALL ON public.material_service_types FROM anon, authenticated;
