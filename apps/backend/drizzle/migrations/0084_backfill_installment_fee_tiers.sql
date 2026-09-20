-- 0083 — backfill das faixas de parcelas 2..12 da taxa de crédito (correção da
-- auditoria do Bloco 3, achado BN-1; ADR-0027).
--
-- Motivo (regressão de taxa 0% pós-0074): a 0074 fez
-- `ADD COLUMN installments smallint NOT NULL DEFAULT 1`, então a taxa ÚNICA de
-- crédito de cada org (e de cada override por membro) virou a faixa 1x e as
-- faixas 2..12 ficaram SEM linha. `resolveFee` só casa a faixa exata e devolve
-- `source: 'none'` (taxa 0%) para vendas parceladas de orgs existentes — antes
-- da 0074 a taxa única valia para todo crédito.
--
-- Esta migration é um backfill de DADOS que PRESERVA o comportamento anterior:
-- copia a config da faixa 1x para as faixas 2..12. NÃO é fallback em tempo de
-- cálculo (o cálculo continua exigindo a faixa exata) e as linhas criadas são
-- linhas de config comuns, EDITÁVEIS pelo owner (upsert/supersede normal).
--
-- Idempotente: reexecutar não duplica nem sobrescreve (ON CONFLICT DO NOTHING
-- + NOT EXISTS); faixas que o owner já tenha configurado são preservadas.
--
-- org_member_payment_fees é versionada (0070): só INSERT de linhas ATIVAS
-- (active = true, superseded_at = NULL, satisfaz o CHECK
-- active_superseded_check). Nenhum UPDATE/DELETE, logo o trigger de
-- imutabilidade não interfere. created_by é copiado da linha 1x de origem.
-- A migration roda como dono da tabela, portanto ignora RLS.
--
-- Teto: 2..12 espelha MAX_INSTALLMENTS (fee-calculator.ts); elevar esse teto
-- exige NOVA migration de backfill.
--
-- Limitação: uma linha de org 0/0 (percent = 0 e fixed_cents = 0) é tratada como
-- JÁ CONFIGURADA (a UI grava faixas em branco como 0), então ambientes que
-- salvaram a tela de taxas entre a 0074 e a 0083 (só dev/local; a 0074 nunca
-- foi implantada) NÃO são reparados e precisam de ajuste manual. Override de
-- membro ativo 0/0 idem.
--
-- Cache: findByOrg mantém cache de 1h; reiniciar o backend após aplicar.

-- (a) org_payment_fees: faixas 2..12 a partir da linha 1x de crédito.
INSERT INTO "public"."org_payment_fees" ("org_id", "payment_method", "installments", "percent", "fixed_cents")
SELECT f."org_id", f."payment_method", g."n", f."percent", f."fixed_cents"
FROM "public"."org_payment_fees" f
CROSS JOIN generate_series(2, 12) AS g("n")
WHERE f."payment_method" = 'credit_card' AND f."installments" = 1
ON CONFLICT ON CONSTRAINT "org_payment_fees_org_method_inst_uq" DO NOTHING;
--> statement-breakpoint

-- (b) org_member_payment_fees: override ATIVO de crédito 1x -> faixas 2..12
-- ativas. Faixa que o membro já tenha ativa é preservada.
INSERT INTO "public"."org_member_payment_fees" ("org_id", "user_id", "payment_method", "installments", "percent", "fixed_cents", "active", "superseded_at", "created_by")
SELECT m."org_id", m."user_id", m."payment_method", g."n", m."percent", m."fixed_cents", true, NULL, m."created_by"
FROM "public"."org_member_payment_fees" m
CROSS JOIN generate_series(2, 12) AS g("n")
WHERE m."payment_method" = 'credit_card' AND m."installments" = 1 AND m."active"
  AND NOT EXISTS (
    SELECT 1 FROM "public"."org_member_payment_fees" x
    WHERE x."org_id" = m."org_id"
      AND x."user_id" = m."user_id"
      AND x."payment_method" = 'credit_card'
      AND x."installments" = g."n"
      AND x."active"
  )
ON CONFLICT DO NOTHING;
