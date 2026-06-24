-- Reverse 0011.
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_category_id_transaction_categories_id_fk";
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "category_id";
ALTER TABLE "materials" DROP COLUMN IF EXISTS "archived_at";
ALTER TABLE "materials" DROP COLUMN IF EXISTS "last_used_at";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "stock_check_interval_days";
ALTER TABLE "org_memberships" DROP COLUMN IF EXISTS "enabled";

DROP TABLE IF EXISTS public.stock_verification_items CASCADE;
DROP TABLE IF EXISTS public.stock_verifications CASCADE;
DROP TABLE IF EXISTS public.customer_attachments CASCADE;
DROP TABLE IF EXISTS public.transaction_categories CASCADE;
