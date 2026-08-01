-- 0035 — coluna system_key em transaction_categories (N-G): identidade estavel
-- para categorias do sistema, que sobrevive a rename (is_protected continua
-- controlando apenas "nao deletavel" — regra deliberada do M5, nao mudar).
-- O codigo de reversao do caixa passa a resolver a categoria de estorno por
-- system_key = 'reversal', nunca por nome.
ALTER TABLE "transaction_categories" ADD COLUMN "system_key" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_categories_org_system_key_idx" ON "transaction_categories" ("org_id", "system_key") WHERE "system_key" IS NOT NULL;
--> statement-breakpoint
-- Adocao: se uma org ja tinha uma categoria "Estorno" criada manualmente (nao
-- protegida), ela vira a categoria do sistema. Comportamento DESEJADO.
UPDATE "transaction_categories" SET "is_protected" = true, "system_key" = 'reversal' WHERE "name" = 'Estorno' AND "system_key" IS NULL;
--> statement-breakpoint
-- Seed: garante a categoria de estorno em toda org que ainda nao a tem.
INSERT INTO "transaction_categories" ("org_id", "name", "is_protected", "system_key")
SELECT o."id", 'Estorno', true, 'reversal'
FROM "organizations" o
WHERE NOT EXISTS (
  SELECT 1 FROM "transaction_categories" c
  WHERE c."org_id" = o."id" AND c."system_key" = 'reversal'
);
