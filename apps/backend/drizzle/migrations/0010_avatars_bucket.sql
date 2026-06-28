-- ============================================================================
-- 0010 — Bucket de Storage para fotos de perfil (avatars).
--
-- Bucket PÚBLICO (leitura via URL pública, sem auth). As escritas são feitas
-- exclusivamente pelo backend com a service_role (que faz BYPASS de RLS em
-- storage.objects), então não há policies de escrita por usuário aqui.
-- Caminho dos objetos: "<auth_id>/avatar.<ext>" (upsert sobrescreve).
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/png','image/jpeg','image/webp','image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
