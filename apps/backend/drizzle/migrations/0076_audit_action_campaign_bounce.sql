-- 0075 — Novo valor de enum para auditoria do bounce de e-mail de campanha (M-campaign-
-- delivery). ALTER TYPE de um enum não pode rodar na mesma transação que cria o
-- tipo/tabela que o usa (precedente: migration 0031/0053/0055/0057/0058/0065), por isso
-- o valor novo de audit_action vai em migration separada.
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'campaign_email_bounced';
