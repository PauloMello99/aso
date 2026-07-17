-- 0025 — coluna is_protected em transaction_categories (M5): protege as 7
-- categorias padrao semeadas na criacao de org (incl. "Outros") contra exclusao.
-- Backfill marca essas categorias como protegidas em orgs ja existentes.
ALTER TABLE "transaction_categories" ADD COLUMN "is_protected" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "transaction_categories" SET "is_protected" = true WHERE "name" IN ('Serviço', 'Funcionário', 'Material', 'Conta', 'Reforma', 'Transferência', 'Outros');
