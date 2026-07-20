-- 0023 down — remove o indice unico. A fusao de clientes duplicados (FKs repontadas + duplicado deletado) NAO e reversivel (mesmo padrao ja aceito em 0018_backfill_created_by_userid, que nao tem down.sql algum) — aqui ao menos o indice e removido.
DROP INDEX IF EXISTS "customers_org_email_lower_uq";
