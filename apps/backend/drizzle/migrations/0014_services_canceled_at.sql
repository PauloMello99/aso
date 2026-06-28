-- 0014 — Estado de cancelamento do serviço (estorno via módulo services).
-- RLS de services/service_materials já existe desde 0000 (insert/update = is_org_member),
-- portanto só adicionamos a coluna nullable.
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "canceled_at" timestamp with time zone;
