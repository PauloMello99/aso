-- Reverte 0062. DROP TABLE (NÃO ALTER TABLE DROP COLUMN) — todas as colunas, inclusive
-- a copy custom por gatilho, nascem junto com a tabela nesta migration. O rollback
-- descarta a copy custom que o dono tenha configurado: irrelevante no Bloco A (nada
-- configurado ainda), relevante depois do Bloco B.
DROP TABLE IF EXISTS public.org_campaign_settings;
