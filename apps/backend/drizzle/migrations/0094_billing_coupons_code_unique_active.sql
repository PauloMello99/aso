-- 0094 — Código de cupom passa a ser único apenas entre cupons ATIVOS (ADR-0040).
-- O UNIQUE(code) global da 0047 impedia reutilizar o código de um cupom desativado
-- ou arquivado, embora o Stripe só proíba dois Promotion Codes ATIVOS com o mesmo
-- código (verificado em modo teste). O espelho local era a única trava.
--
-- Decisões não óbvias:
--   (i)   Índice único PARCIAL em ("code") WHERE active AND code IS NOT NULL no
--         lugar do constraint `billing_coupons_code_unique`. Linhas inativas ou
--         sem código ficam fora do índice, então o histórico (arquivado) pode
--         repetir o código de um cupom ativo. `code IS NOT NULL` é redundante
--         (NULL nunca colide num UNIQUE) e existe só para documentar a intenção.
--   (ii)  Os dados existentes já eram únicos globalmente, logo também são únicos
--         entre os ativos: o CREATE UNIQUE INDEX não pode falhar por duplicidade.
--   (iii) Lookup por código continua indexado: `findByCode` filtra
--         `code = $1 AND active = true`, que o planner atende com o índice parcial
--         (o predicado é implicado pela query). Não há índice não-único extra.
--   (iv)  Lock curto: tabela pequena (catálogo global de cupons, administrado só
--         por super_admin), sem necessidade de CONCURRENTLY — que de qualquer
--         forma não roda dentro da transação do migrator.
--   (v)   Idempotente: DROP CONSTRAINT IF EXISTS + CREATE UNIQUE INDEX IF NOT
--         EXISTS. DROP CONSTRAINT remove também o índice que o sustentava.
--   (vi)  Reativar um cupom cujo código foi tomado por outro ativo passa a ser
--         barrado na aplicação (BILLING_COUPON_CODE_ALREADY_EXISTS) e, em corrida,
--         pelo próprio índice (23505 mapeado para a mesma exceção no repositório).
--   (vii) RLS permanece habilitado sem policy (0047); nada muda em acesso.

ALTER TABLE "billing_coupons"
  DROP CONSTRAINT IF EXISTS "billing_coupons_code_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_coupons_code_active_unique"
  ON "billing_coupons" ("code")
  WHERE "active" AND "code" IS NOT NULL;
