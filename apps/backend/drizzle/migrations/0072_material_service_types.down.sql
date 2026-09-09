-- Rollback da 0072 — material_service_types é tabela de configuração
-- declarativa (vínculo manual entre material e tipo de serviço), sem dado
-- financeiro envolvido. O rollback perde os vínculos declarados; nenhum
-- lançamento de caixa ou histórico é afetado.

DROP TABLE IF EXISTS public.material_service_types CASCADE;
--> statement-breakpoint

ALTER TABLE "public"."materials" DROP CONSTRAINT IF EXISTS "materials_id_org_uq";
--> statement-breakpoint
ALTER TABLE "public"."service_types" DROP CONSTRAINT IF EXISTS "service_types_id_org_uq";
--> statement-breakpoint

DROP INDEX IF EXISTS "public"."materials_org_name_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "public"."customers_org_name_idx";
