-- 0085 — Novo valor de enum para a notificação de resposta do cliente à confirmação de agendamento.
-- Migration própria: o valor novo não pode ser usado na mesma transação que o cria.
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'appointment_confirmation_response';
