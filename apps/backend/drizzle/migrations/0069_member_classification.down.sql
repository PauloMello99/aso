-- Reverte 0069. Ordem obrigatória: a COLUNA primeiro, o TIPO depois (o enum é
-- referenciado pela coluna "classification", então DROP TYPE antes da coluna falharia).
ALTER TABLE "public"."org_memberships" DROP COLUMN IF EXISTS "classification";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."member_classification";
