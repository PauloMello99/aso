-- ============================================================================
-- 0012 — Bucket de Storage PRIVADO para anexos de cliente (ex.: ficha de anamnese).
--
-- PRIVADO (public=false): leitura só via signed URL gerada pelo backend com a
-- service_role (que faz BYPASS de RLS em storage.objects). Caminho dos objetos:
-- "<org_id>/<customer_id>/<uuid>_<arquivo>".
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-files',
  'customer-files',
  false,
  10485760, -- 10 MB
  ARRAY['image/png','image/jpeg','image/webp','image/gif','application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
