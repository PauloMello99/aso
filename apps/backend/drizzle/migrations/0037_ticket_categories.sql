-- 0037 — Support M1a (fatia A, passo 1): ticket_categories.
-- Tabela GLOBAL (sem org_id) — lookup de plataforma, não dado de tenant. Leitura
-- livre para qualquer sessão autenticada; escrita só via migration/DRIZZLE_ADMIN
-- (sem policy de INSERT/UPDATE/DELETE nesta v1).
CREATE TABLE IF NOT EXISTS "ticket_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "system_key" text NOT NULL,
  "label" text NOT NULL,
  "sla_first_response_minutes" integer NOT NULL,
  "sla_resolution_minutes" integer NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "ticket_categories_system_key_unique" UNIQUE("system_key")
);
--> statement-breakpoint
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- RLS POLICIES — ticket_categories (leitura livre; escrita só via DRIZZLE_ADMIN)
CREATE POLICY "ticket_categories_select" ON public.ticket_categories
  FOR SELECT USING (true);
--> statement-breakpoint
-- Seed idempotente — SLA v1 igual para todas (8h primeira resposta / 48h resolução),
-- ajustável depois por UPDATE direto, sem migration nova.
INSERT INTO "ticket_categories" ("system_key", "label", "sla_first_response_minutes", "sla_resolution_minutes")
VALUES
  ('cashier', 'Caixa', 480, 2880),
  ('customers', 'Clientes', 480, 2880),
  ('materials', 'Materiais', 480, 2880),
  ('services', 'Serviços', 480, 2880),
  ('calendar', 'Agenda', 480, 2880),
  ('other', 'Outros', 480, 2880)
ON CONFLICT ("system_key") DO NOTHING;
