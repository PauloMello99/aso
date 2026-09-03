-- ============================================================================
-- 0068 — Bucket de Storage para imagens de campanha de e-mail (campaign-images).
--
-- Bucket PÚBLICO (public=true) DE PROPÓSITO: o destinatário abre o e-mail num
-- cliente de e-mail que não autentica no Supabase, então uma signed URL (que
-- expira e exige token) não serve — a imagem precisa carregar por URL pública
-- direta no HTML do e-mail. Mesma escolha do bucket 'avatars' (0010).
--
-- As escritas são feitas EXCLUSIVAMENTE pelo backend com a service_role (que faz
-- BYPASS de RLS em storage.objects), então NÃO há policies de escrita por
-- usuário aqui — idêntico a 'avatars' (0010). A leitura de bucket público é
-- liberada pelo próprio Supabase, sem policy. Observação: 0012
-- (customer-files, bucket PRIVADO) também não cria nenhuma policy de
-- storage.objects inline; portanto 0068 segue o padrão de 0010 e não define
-- nenhuma policy.
--
-- Caminho dos objetos: "<org_id>/<uuid>.<ext>". O prefixo org_id dá
-- rastreabilidade e escopo por organização; cada upload usa um uuid próprio
-- (path único, sem sobrescrita).
--
-- Limite de 2 MB por arquivo; mimes aceitos: image/jpeg, image/png,
-- image/webp, image/gif.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-images',
  'campaign-images',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
