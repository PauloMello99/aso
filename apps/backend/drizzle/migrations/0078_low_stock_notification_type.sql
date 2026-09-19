-- 0078 — Novo valor de enum para a notificação de estoque baixo.
-- Migration própria: o valor novo não pode ser usado na mesma transação que o cria.
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'low_stock';
