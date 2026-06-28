-- 0016 — Remove a coluna body_part de services.
-- O campo "local do corpo" era específico de tatuagem; o sistema passa a ser
-- genérico (abrange outros tipos de negócio). Sem dependências (sem índices/FK).
ALTER TABLE "services" DROP COLUMN IF EXISTS "body_part";
