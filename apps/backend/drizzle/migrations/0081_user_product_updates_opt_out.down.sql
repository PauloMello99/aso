-- Reverte 0081. AVISO: o opt-out registrado é DESTRUÍDO; todos os usuários voltam a
-- "consente" (NULL) e passam a receber e-mails de novidades novamente.
ALTER TABLE public.users DROP COLUMN IF EXISTS "product_updates_opted_out_at";
