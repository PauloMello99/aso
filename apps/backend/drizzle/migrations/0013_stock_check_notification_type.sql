-- 0013 — Novo valor de enum para o lembrete de conferência de estoque.
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'stock_check_reminder';
