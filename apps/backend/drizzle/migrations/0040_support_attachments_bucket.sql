-- ============================================================================
-- 0040 — Bucket de Storage PRIVADO para anexos de ticket de suporte.
--
-- PRIVADO (public=false): leitura só via signed URL gerada pelo backend com a
-- service_role (que faz BYPASS de RLS em storage.objects) — mesmo padrão de
-- 0010 (avatars) e 0012 (customer-files). Caminho dos objetos:
-- "<org_id>/<ticket_id>/<uuid>-<file_name>".
--
-- Sem CREATE POLICY em storage.objects: nenhum bucket deste projeto tem policy
-- de RLS em storage.objects (conferir 0010/0012, únicos precedentes de bucket)
-- — todo acesso passa pelo backend via service_role (upload/list/signed URL),
-- nunca direto do cliente com a chave anon/authenticated. Reproduz aqui a
-- mesma superfície de acesso, sem abrir leitura/escrita direta nova.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments',
  'support-attachments',
  false,
  10485760, -- 10 MB, mesmo limite de customer-files (0012)
  ARRAY['image/png','image/jpeg','image/webp','image/gif','application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
