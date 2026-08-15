-- 0045 down — dado é log de processamento do webhook, descartável (diferente
-- das tabelas de conteúdo real do usuário em 0044): sem guard de bloqueio.
DROP TABLE IF EXISTS "support_inbound_emails";
