-- 0065 — Novo valor de enum para auditoria do upsert de configuração de campanhas de
-- e-mail da org (liga/desliga gatilhos, edita copy). ALTER TYPE de um enum não pode rodar
-- na mesma transação que cria o tipo/tabela que o usa (precedente: migration
-- 0031/0053/0055/0057/0058), por isso o valor novo de audit_action vai em migration separada.
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'campaign_settings_updated';
