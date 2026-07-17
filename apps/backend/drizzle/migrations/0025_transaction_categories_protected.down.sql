-- 0025 down — remove a coluna is_protected de transaction_categories.
ALTER TABLE "transaction_categories" DROP COLUMN IF EXISTS "is_protected";
