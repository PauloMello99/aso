-- 0021 — Conexão de calendário externo por organização (BL-1, fundação).
-- Uma conexão por org (Google/Outlook/Apple). A integração OAuth viva é futura
-- (atrás da flag EXTERNAL_CALENDARS_ENABLED); esta tabela é o terreno do modelo.
DO $$ BEGIN
  CREATE TYPE "calendar_provider" AS ENUM ('google', 'outlook', 'apple');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "provider" "calendar_provider" NOT NULL,
  "external_account_email" text,
  "connected_by" uuid,
  "connected_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "calendar_connections_org_id_unique" UNIQUE ("org_id")
);
--> statement-breakpoint
ALTER TABLE "calendar_connections" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Leitura: qualquer membro da org (estado da conexão). Super_admin vê tudo.
CREATE POLICY "calendar_connections_select" ON "calendar_connections"
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
-- Escrita: owner da org (gerência da conexão) ou super_admin.
CREATE POLICY "calendar_connections_modify" ON "calendar_connections"
  FOR ALL USING (public.is_super_admin() OR public.is_org_owner(org_id))
  WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));
