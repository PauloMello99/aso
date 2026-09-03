-- Recria a ESTRUTURA da tabela "org_campaign_settings" (rollback do DROP da 0067);
-- NUNCA restaura os DADOS que existiam antes do DROP. Estrutura idêntica à criada
-- originalmente pela migration 0062 (tabela + RLS + 3 policies + REVOKE).
CREATE TABLE public.org_campaign_settings (
	"org_id" uuid PRIMARY KEY REFERENCES public.organizations("id") ON DELETE CASCADE,
	"post_service_enabled" boolean NOT NULL DEFAULT false,
	"birthday_enabled" boolean NOT NULL DEFAULT false,
	"inactivity_enabled" boolean NOT NULL DEFAULT false,
	"inactivity_months" integer NOT NULL DEFAULT 6,
	"post_service_subject" text,
	"post_service_body" text,
	"birthday_subject" text,
	"birthday_body" text,
	"inactivity_subject" text,
	"inactivity_body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_campaign_settings_inactivity_months_check" CHECK ("inactivity_months" BETWEEN 1 AND 36),
	CONSTRAINT "org_campaign_settings_post_service_subject_check" CHECK ("post_service_subject" IS NULL OR (char_length(btrim("post_service_subject", E' \t\n\r')) BETWEEN 1 AND 200 AND char_length("post_service_subject") <= 200)),
	CONSTRAINT "org_campaign_settings_birthday_subject_check" CHECK ("birthday_subject" IS NULL OR (char_length(btrim("birthday_subject", E' \t\n\r')) BETWEEN 1 AND 200 AND char_length("birthday_subject") <= 200)),
	CONSTRAINT "org_campaign_settings_inactivity_subject_check" CHECK ("inactivity_subject" IS NULL OR (char_length(btrim("inactivity_subject", E' \t\n\r')) BETWEEN 1 AND 200 AND char_length("inactivity_subject") <= 200)),
	CONSTRAINT "org_campaign_settings_post_service_body_check" CHECK ("post_service_body" IS NULL OR (char_length(btrim("post_service_body", E' \t\n\r')) BETWEEN 1 AND 5000 AND char_length("post_service_body") <= 5000)),
	CONSTRAINT "org_campaign_settings_birthday_body_check" CHECK ("birthday_body" IS NULL OR (char_length(btrim("birthday_body", E' \t\n\r')) BETWEEN 1 AND 5000 AND char_length("birthday_body") <= 5000)),
	CONSTRAINT "org_campaign_settings_inactivity_body_check" CHECK ("inactivity_body" IS NULL OR (char_length(btrim("inactivity_body", E' \t\n\r')) BETWEEN 1 AND 5000 AND char_length("inactivity_body") <= 5000))
);
--> statement-breakpoint
ALTER TABLE public.org_campaign_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "org_campaign_settings_select" ON public.org_campaign_settings
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "org_campaign_settings_insert" ON public.org_campaign_settings
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));
--> statement-breakpoint
CREATE POLICY "org_campaign_settings_update" ON public.org_campaign_settings
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_owner(org_id))
  WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));
--> statement-breakpoint
REVOKE ALL ON public.org_campaign_settings FROM anon, authenticated;
