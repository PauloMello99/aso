-- ============================================================================
-- 0088 — Bucket de Storage PRIVADO para imagens de referência dos pedidos de
-- orçamento (quote-request-images). Bloco C, fatia C1.
--
-- PRIVADO (public=false): leitura só via signed URL curta gerada pelo backend
-- com a service_role (BYPASS de RLS em storage.objects) — previsto para C2.
-- Escritas também só pelo backend; por isso NÃO há policies em storage.objects
-- (mesmo padrão de 0012/0068).
--
-- Caminho dos objetos: "<org_id>/<quote_request_id>/<uuid>.<ext>".
-- Limite de 5 MB por arquivo; mimes: jpeg, png, webp, heic, heif.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quote-request-images',
  'quote-request-images',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
