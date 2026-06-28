-- SEC-2: padroniza created_by de auth_id (Supabase) para users.id (app).
-- Linhas legadas guardavam o auth_id em created_by; o comportamento atual grava
-- users.id (ver cashier/resolve-actor). Com o escopo por funcionário agora ativo
-- (created_by = users.id), a inconsistência deixa de ser inofensiva — backfill.
-- O guard NOT EXISTS evita reescrever linhas que já apontam para um users.id válido.

UPDATE "transactions" t
SET "created_by" = u."id"
FROM "users" u
WHERE t."created_by" = u."auth_id"
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE u2."id" = t."created_by");
--> statement-breakpoint
UPDATE "customers" c
SET "created_by" = u."id"
FROM "users" u
WHERE c."created_by" = u."auth_id"
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE u2."id" = c."created_by");
--> statement-breakpoint
UPDATE "stock_movements" s
SET "created_by" = u."id"
FROM "users" u
WHERE s."created_by" = u."auth_id"
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE u2."id" = s."created_by");
--> statement-breakpoint
UPDATE "services" sv
SET "created_by" = u."id"
FROM "users" u
WHERE sv."created_by" = u."auth_id"
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE u2."id" = sv."created_by");
