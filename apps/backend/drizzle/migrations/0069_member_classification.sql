-- 0069 — org_memberships: coluna de classificação do funcionário ('resident' | 'guest').
-- Rótulo DISPLAY-ONLY: zero influência em regra de negócio, RLS, billing, caixa ou
-- qualquer decisão de autorização — é só metadado exibido na UI de membros.
--
-- Aditiva e nullable, SEM default e SEM backfill: linhas existentes ficam com
-- classification IS NULL (= "não classificado"), estado válido por construção.
--
-- SEM policy nova: a escrita desta coluna passa por org_memberships_update, que já é
-- USING (is_super_admin() OR is_org_owner(org_id)) (ver 0000_magenta_swarm.sql
-- ~L322-323) — exatamente o ator autorizado a classificar um membro. Nada a adicionar.
CREATE TYPE "public"."member_classification" AS ENUM ('resident', 'guest');
--> statement-breakpoint
ALTER TABLE "public"."org_memberships" ADD COLUMN "classification" "public"."member_classification";
