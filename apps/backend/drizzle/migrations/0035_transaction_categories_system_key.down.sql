-- 0035 down — remove a coluna system_key e seu indice de transaction_categories.
-- NAO apaga as linhas de categoria "Estorno" semeadas/adotadas pela 0035:
-- transactions.category_id tem onDelete 'set null', e o caixa e append-only
-- (ADR-0010) — apagar a categoria zeraria silenciosamente o category_id de
-- reversoes ja criadas, sem forma de corrigir depois.
DROP INDEX IF EXISTS "transaction_categories_org_system_key_idx";
--> statement-breakpoint
ALTER TABLE "transaction_categories" DROP COLUMN IF EXISTS "system_key";
