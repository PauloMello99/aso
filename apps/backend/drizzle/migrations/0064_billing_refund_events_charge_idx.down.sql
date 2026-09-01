-- Reverte 0064. Só o índice — a tabela e as demais constraints são da 0060.
DROP INDEX IF EXISTS "public"."billing_refund_events_charge_idx";
