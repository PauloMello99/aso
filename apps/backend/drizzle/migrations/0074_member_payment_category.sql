-- 0073 — system_key = 'member_payment' na categoria "Funcionario" (N-G, mesmo
-- padrao da 0035 para 'reversal'): identidade estavel para a categoria usada
-- pelo CreateMemberPaymentUseCase (Bloco 2, ADR-0026), que resolve a categoria
-- por system_key, nunca por nome.
-- Adocao: se a org ja tem a categoria "Funcionario" seedada (nao protegida por
-- system_key ainda), ela vira a categoria do sistema. Comportamento DESEJADO.
UPDATE "transaction_categories" SET "is_protected" = true, "system_key" = 'member_payment' WHERE "name" = 'Funcionário' AND "system_key" IS NULL;
--> statement-breakpoint
-- Seed: garante a categoria de pagamento a membro em toda org que ainda nao a tem.
INSERT INTO "transaction_categories" ("org_id", "name", "is_protected", "system_key")
SELECT o."id", 'Funcionário', true, 'member_payment'
FROM "organizations" o
WHERE NOT EXISTS (
  SELECT 1 FROM "transaction_categories" c
  WHERE c."org_id" = o."id" AND c."system_key" = 'member_payment'
);
