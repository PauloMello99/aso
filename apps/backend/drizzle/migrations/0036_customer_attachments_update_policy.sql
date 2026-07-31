-- 0036 — N-J-2: policy de UPDATE ausente em customer_attachments (0011 so criou
-- select/insert/delete). Sem ela, o rename de anexo (UPDATE ... RETURNING sob
-- DRIZZLE/RLS) casa zero linhas e o backend confunde com "anexo nao encontrado".
-- Mesma regra de membership das demais policies da tabela.
CREATE POLICY "customer_attachments_update" ON public.customer_attachments
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_member(org_id));
