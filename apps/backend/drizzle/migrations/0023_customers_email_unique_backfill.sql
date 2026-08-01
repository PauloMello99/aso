-- 0023 — dedup de clientes duplicados por (org_id, lower(btrim(email))), mantendo o mais antigo (menor created_at, desempate por id), repontando FKs de services/calendar_events/customer_attachments para o canonico antes de deletar o duplicado, e entao criando indice unico parcial. Duplicado real confirmado em staging (org 0e4c694d-bba5-4ed6-9498-5f5f8bdc7879, email joao@gmail.com).
WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY org_id, lower(nullif(btrim(email), ''))
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM customers
  WHERE email IS NOT NULL AND btrim(email) <> ''
)
UPDATE services s
SET customer_id = r.canonical_id
FROM ranked r
WHERE s.customer_id = r.id AND r.id <> r.canonical_id;
--> statement-breakpoint
WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY org_id, lower(nullif(btrim(email), ''))
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM customers
  WHERE email IS NOT NULL AND btrim(email) <> ''
)
UPDATE calendar_events c
SET customer_id = r.canonical_id
FROM ranked r
WHERE c.customer_id = r.id AND r.id <> r.canonical_id;
--> statement-breakpoint
WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY org_id, lower(nullif(btrim(email), ''))
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM customers
  WHERE email IS NOT NULL AND btrim(email) <> ''
)
UPDATE customer_attachments ca
SET customer_id = r.canonical_id
FROM ranked r
WHERE ca.customer_id = r.id AND r.id <> r.canonical_id;
--> statement-breakpoint
WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY org_id, lower(nullif(btrim(email), ''))
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM customers
  WHERE email IS NOT NULL AND btrim(email) <> ''
)
DELETE FROM customers c
USING ranked r
WHERE c.id = r.id AND r.id <> r.canonical_id;
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_org_email_lower_uq" ON "customers" (org_id, lower(btrim(email))) WHERE email IS NOT NULL AND btrim(email) <> '';
