-- Restaura trial_consumed=false para organizações que tiveram o trial queimado
-- indevidamente por um bug: create-checkout-session.use-case.ts marcava
-- trial_consumed=true no momento de CRIAR a checkout session do Stripe, não ao
-- confirmar o pagamento. Um checkout abandonado (aba fechada, hesitação) queimava
-- o trial de 60 dias permanentemente, mesmo sem a org nunca ter sido cobrada ou
-- usado o produto. Corrigido no código desta mesma migration/release: trial_consumed
-- agora só é marcado true pelo sync do Stripe (webhook + reconciliação cron), quando
-- trial_end vem preenchido.
--
-- Predicado conservador: só restaura quem NUNCA teve trial confirmado no Stripe
-- (trial_ends_at IS NULL) e nunca chegou a ter subscription no Stripe
-- (stripe_subscription_id IS NULL). stripe_subscription_id permanece preenchido após
-- cancelamento via Stripe; a única exceção é grant-comp.use-case.ts, que zera o campo
-- ao converter a org em comp — mas uma ex-comp que teve trial real carrega
-- trial_ends_at preenchido (grant/revoke-comp nunca tocam essa coluna), então já é
-- excluída pela primeira cláusula. Exclui orgs comp vigentes (type <> 'custom').
--
-- LIMITAÇÃO CONHECIDA (revisão do database-guardian): o predicado não distingue
-- checkout abandonado (alvo legítimo) de checkout CONCLUÍDO cujo webhook nunca
-- chegou/foi processado — nesse segundo caso o trial rodou de verdade no Stripe, mas
-- como nenhum sync ocorreu, todas as colunas locais (trial_ends_at,
-- stripe_subscription_id, etc.) ficam NULL do mesmo jeito, e a linha nunca se
-- autocorrige via reconciliação (findAllStripeLinked exige stripe_customer_id E
-- stripe_subscription_id não nulos). Risco de falso positivo: no máximo um trial de
-- 60 dias extra por org afetada; sem corrupção de dado nem vazamento entre orgs.
--
-- GATE OBRIGATÓRIO antes de aplicar em qualquer ambiente com dados reais (local
-- não conta): rodar o SELECT abaixo trocando COUNT(*) por
-- (org_id, stripe_customer_id, created_at), e para cada stripe_customer_id retornado,
-- checar no Dashboard/API do Stripe se existe alguma subscription desse customer com
-- trial_end preenchido. Se existir, excluir aquele org_id do UPDATE
-- (AND org_id NOT IN (...)) antes de aplicar.
--
-- Contagem de linhas afetadas (medida antes de aplicar, banco local de dev, 2026-08-17): 0

DO $$
DECLARE
  affected_count integer;
BEGIN
  UPDATE subscriptions
  SET trial_consumed = false,
      updated_at = now()
  WHERE trial_consumed = true
    AND trial_ends_at IS NULL
    AND stripe_subscription_id IS NULL
    AND type <> 'custom';

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'migration 0050: % organizacao(oes) tiveram trial_consumed restaurado para false', affected_count;
END $$;
