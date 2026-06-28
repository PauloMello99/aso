-- 0015 — Membros da mesma org podem ler os dados básicos uns dos outros.
-- Antes, users_select só permitia ver a própria linha (auth.uid() = auth_id);
-- com isso a listagem de membros (join org_memberships → users) só retornava
-- o próprio usuário. Esta policy adicional (SELECT policies são OR) libera ler
-- a linha de users de quem compartilha uma org comigo. Usa o helper
-- is_org_member (SECURITY DEFINER) para evitar recursão de RLS.
CREATE POLICY "users_select_same_org" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships them
      WHERE them.user_id = users.id
        AND public.is_org_member(them.org_id)
    )
  );
