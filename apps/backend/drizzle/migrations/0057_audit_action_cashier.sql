-- 0057 — Novos valores de enum para auditoria do caixa: criação de lançamento, edição
-- de taxas e edição de comissões. ALTER TYPE de um enum não pode rodar na mesma
-- transação que cria o tipo/tabela que o usa (precedente: migration 0031/0053/0055),
-- por isso os 3 valores novos de audit_action vão em migration separada.
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'cashier_transaction_created';
--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'cashier_fees_updated';
--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'cashier_commissions_updated';
