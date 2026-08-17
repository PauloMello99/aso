-- Reverte 0048. As colunas de preço em billing_plans NÃO são tocadas por
-- esta migration nem pelo seu down — o backfill só leu delas, nunca escreveu.
-- Reverter é lossless: o dado real do preço continua em billing_plans.
DROP TABLE IF EXISTS "billing_plan_prices" CASCADE;
