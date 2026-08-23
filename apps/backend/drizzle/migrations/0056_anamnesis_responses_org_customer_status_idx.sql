-- 0056 — Índice para as leituras de anamnese que filtram por (org_id, customer_id,
-- status): findSubmittedForVersion / findPendingFor / findLinkable faziam seq scan.
CREATE INDEX IF NOT EXISTS "anamnesis_responses_org_customer_status_idx" ON "anamnesis_responses" ("org_id","customer_id","status");
