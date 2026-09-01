-- Reverte 0061. DROP TABLE derruba policies, índice do UNIQUE, checks e a FK composta
-- junto — não precisa de statements explícitos para eles.
-- ATENÇÃO: a partir do 1º envio real de campanha este rollback é praticamente
-- irreversível — os "unsubscribe_token" já foram para dentro de e-mails entregues e
-- não podem ser regenerados idênticos. Só reverter antes de qualquer disparo em prod.
DROP TABLE IF EXISTS public.customer_email_preferences;
