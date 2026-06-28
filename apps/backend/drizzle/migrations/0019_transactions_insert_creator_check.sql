-- SEC-1: defense-in-depth no INSERT do caixa, agora que o funcionário tem acesso.
-- Alinha a policy à regra de produto: funcionário só lança em nome próprio; owner
-- pode lançar em nome de qualquer membro. O SELECT permanece org-wide (necessário
-- para o saldo corrente e o histórico) — apenas o INSERT ganha a checagem de autoria.
-- created_by IS NULL é tolerado (compat. com lançamentos sem autor explícito).
DROP POLICY IF EXISTS "transactions_insert" ON public.transactions;
--> statement-breakpoint
CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR (
      public.is_org_member(org_id) AND (
        public.is_org_owner(org_id)
        OR created_by IS NULL
        OR created_by = (SELECT id FROM public.users WHERE auth_id = auth.uid())
      )
    )
  );
