-- 0027 — M7: regras e mídia de serviços.
-- requires_age_verification em service_types (sinaliza tipos de serviço que exigem
-- verificação de idade do cliente) e tabela service_media para anexos de referência
-- do serviço (fotos do resultado, referências enviadas pelo cliente). Arquivos ficam
-- num bucket PRIVADO do Storage; guardamos só o caminho e servimos via signed URL.
ALTER TABLE "service_types" ADD COLUMN "requires_age_verification" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_media" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
  "storage_path" text NOT NULL,
  "file_name" text NOT NULL,
  "content_type" text,
  "uploaded_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_media_service_id_idx" ON "service_media" ("service_id");
--> statement-breakpoint
ALTER TABLE public.service_media ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- RLS POLICIES — service_media (org_id denormalizado, igual customer_attachments)
CREATE POLICY "service_media_select" ON public.service_media
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "service_media_insert" ON public.service_media
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "service_media_delete" ON public.service_media
  FOR DELETE USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-media',
  'service-media',
  false,
  307200,
  ARRAY['image/png','image/jpeg','image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
