-- 0087 — Formulário público de orçamento (Bloco C, fatia C1): formulário por
-- profissional, pedidos de orçamento (lead) e imagens de referência.
--
-- Decisões não óbvias:
--   (i)   Entidade PRÓPRIA (`quote_requests`), não `customers`: o solicitante é
--         um lead anônimo, sem cadastro; não deve poluir a base de clientes nem
--         disparar campanhas/lembretes.
--   (ii)  `quote_forms.slug` é GLOBALMENTE único (o URL /orcamento/{slug} vai na
--         bio do Instagram; o slug da org são 20 letras aleatórias e não serve).
--         O CHECK já impõe minúsculas, então UNIQUE simples basta.
--   (iii) `status` é text + CHECK (não enum): evita o gotcha de
--         ALTER TYPE ... ADD VALUE em migration própria (ADR-0035) quando C2/C3
--         ampliarem os estados — basta trocar o CHECK.
--   (iv)  Escritas PÚBLICAS (sem sessão) só via DRIZZLE_ADMIN escopado (ADR-0021/
--         0035): o RlsInterceptor não abre transação sem usuário. Por isso
--         `quote_requests` e `quote_request_images` NÃO têm NENHUMA policy
--         (deny-by-default, mesmo molde de support_inbound_emails/0045); C2
--         cria a policy de SELECT junto com o use-case de leitura.
--   (v)   `expires_at` (30 dias) é gravado desde já; o cron de expiração e a
--         limpeza do storage vêm em C3.
--   (vi)  `user_id`/`target_user_id` sem FK (padrão 0070/0073): membro é linha
--         de `users`/`org_memberships`, não entidade própria do módulo.
--   (vii) Sem IP/User-Agent no pedido (minimização LGPD): a evidência do
--         consentimento é versão + timestamp + snapshot do texto.

-- "Próprio membro": evita subquery inline em users/org_memberships sujeita ao
-- RLS dessas tabelas. Molde de is_org_member (0000), restrito ao próprio
-- user_id e a membership habilitada.
CREATE OR REPLACE FUNCTION public.is_self_member(p_org_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_memberships om
    JOIN public.users u ON u.id = om.user_id
    WHERE u.auth_id = auth.uid()
      AND om.org_id = p_org_id
      AND om.user_id = p_user_id
      AND om.enabled = true
  )
$$;
--> statement-breakpoint

CREATE TABLE "public"."quote_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_forms_slug_check" CHECK ("slug" ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' AND position('--' in "slug") = 0),
	CONSTRAINT "quote_forms_display_name_check" CHECK (char_length(btrim("display_name")) BETWEEN 1 AND 80),
	CONSTRAINT "quote_forms_org_user_uq" UNIQUE ("org_id", "user_id"),
	CONSTRAINT "quote_forms_slug_uq" UNIQUE ("slug"),
	CONSTRAINT "quote_forms_id_org_id_uq" UNIQUE ("id", "org_id")
);
--> statement-breakpoint

CREATE TABLE "public"."quote_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
	"target_user_id" uuid NOT NULL,
	"requester_name" text NOT NULL,
	"requester_phone" text NOT NULL,
	"requester_email" text NOT NULL,
	"idea" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"consent_version" text NOT NULL,
	"consent_text_snapshot" text NOT NULL,
	"privacy_consent_accepted_at" timestamp with time zone NOT NULL,
	"contact_retention_consent_accepted_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_requests_requester_name_check" CHECK (char_length("requester_name") BETWEEN 1 AND 120),
	CONSTRAINT "quote_requests_requester_phone_check" CHECK (char_length("requester_phone") BETWEEN 8 AND 20),
	CONSTRAINT "quote_requests_requester_email_check" CHECK (char_length("requester_email") BETWEEN 3 AND 254),
	CONSTRAINT "quote_requests_idea_check" CHECK (char_length("idea") BETWEEN 1 AND 2000),
	CONSTRAINT "quote_requests_status_check" CHECK ("status" IN ('new')),
	CONSTRAINT "quote_requests_expires_after_created_check" CHECK ("expires_at" > "created_at"),
	CONSTRAINT "quote_requests_id_org_id_uq" UNIQUE ("id", "org_id")
);
--> statement-breakpoint
CREATE INDEX "quote_requests_org_target_created_idx" ON "public"."quote_requests" ("org_id", "target_user_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX "quote_requests_expires_at_idx" ON "public"."quote_requests" ("expires_at");
--> statement-breakpoint

CREATE TABLE "public"."quote_request_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"position" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_request_images_storage_path_uq" UNIQUE ("storage_path"),
	CONSTRAINT "quote_request_images_content_type_check" CHECK ("content_type" IN ('image/jpeg','image/png','image/webp','image/heic','image/heif')),
	CONSTRAINT "quote_request_images_size_check" CHECK ("size_bytes" > 0 AND "size_bytes" <= 5242880),
	CONSTRAINT "quote_request_images_position_check" CHECK ("position" BETWEEN 0 AND 2),
	CONSTRAINT "quote_request_images_storage_path_check" CHECK ("storage_path" LIKE "org_id"::text || '/' || "quote_request_id"::text || '/%'),
	CONSTRAINT "quote_request_images_request_position_uq" UNIQUE ("quote_request_id", "position"),
	-- Endurecimento cross-tenant (molde 0073): a imagem só aponta para pedido da PRÓPRIA org.
	CONSTRAINT "quote_request_images_request_org_fk" FOREIGN KEY ("quote_request_id", "org_id") REFERENCES "public"."quote_requests" ("id", "org_id") ON DELETE CASCADE
);
--> statement-breakpoint

ALTER TABLE public.quote_forms ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.quote_request_images ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "quote_forms_select" ON public.quote_forms
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "quote_forms_insert" ON public.quote_forms
  FOR INSERT WITH CHECK (public.is_self_member(org_id, user_id));
--> statement-breakpoint
CREATE POLICY "quote_forms_update" ON public.quote_forms
  FOR UPDATE USING (public.is_self_member(org_id, user_id))
  WITH CHECK (public.is_self_member(org_id, user_id));
--> statement-breakpoint

-- Sem policy de DELETE em quote_forms (RLS nega). Sem NENHUMA policy em
-- quote_requests/quote_request_images (deny-by-default; só DRIZZLE_ADMIN).
-- Defesa em profundidade: a Data API do Supabase concede GRANT por padrão.
REVOKE ALL ON public.quote_forms FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON public.quote_requests FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON public.quote_request_images FROM anon, authenticated;
