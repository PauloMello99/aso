-- 0090 — Novo valor de enum para a notificação de pedido de orçamento recebido (C2).
-- Migration própria: o valor novo não pode ser usado na mesma transação que o cria.
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'quote_request_received';
