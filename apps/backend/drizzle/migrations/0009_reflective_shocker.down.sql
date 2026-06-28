-- Reverse 0009: org_payment_fees table + transactions split columns.

DROP POLICY IF EXISTS "org_payment_fees_delete" ON public.org_payment_fees;
DROP POLICY IF EXISTS "org_payment_fees_update" ON public.org_payment_fees;
DROP POLICY IF EXISTS "org_payment_fees_insert" ON public.org_payment_fees;
DROP POLICY IF EXISTS "org_payment_fees_select" ON public.org_payment_fees;

DROP TABLE IF EXISTS public.org_payment_fees CASCADE;

DROP INDEX IF EXISTS "transactions_reverses_idx";
DROP INDEX IF EXISTS "transactions_org_method_idx";
DROP INDEX IF EXISTS "transactions_org_transacted_idx";

ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_reverses_transaction_id_transactions_id_fk";

ALTER TABLE "transactions" DROP COLUMN IF EXISTS "reverses_transaction_id";
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "fee_cents";
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "amount_gross_cents";
