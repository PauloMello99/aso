-- 0071 — pré-requisito da importação de dados do sistema legado Ink House.
-- Relaxa customers.number/city/state para aceitar NULL. Clientes importados do Ink
-- House têm apenas um endereço de linha única (`address`), sem número/cidade/estado
-- estruturados — não há como inventá-los sem geocodificação. A obrigatoriedade é
-- mantida nas camadas de aplicação: CreateCustomerDto (`@IsNotEmpty`) e o
-- customerSchema do frontend (zod `.min(1)`), que valida tanto a criação quanto a
-- edição (form único) — o owner é forçado a preencher ao reabrir o cliente importado.
-- Reverte parcialmente a 0024 (que tornou address/city/state/number NOT NULL).
-- `address` permanece NOT NULL (o legado sempre tem esse campo).
ALTER TABLE "customers" ALTER COLUMN "number" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "city" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "state" DROP NOT NULL;
