-- 0038 — Support M1a (fatia A, passo 2): tickets, ticket_responses, ticket_attachments.
-- Fatia A é portal autenticado + fila admin, SEM formulário público/anônimo — logo
-- org_id é NOT NULL nas 3 tabelas, sem ramificação de ticket órfão (isso fica para uma
-- fatia futura com form público).
-- status/priority/author_type via CREATE TYPE ... AS ENUM (padrão do projeto, igual
-- invitation_status/subscription_status) — não text+CHECK.
-- ticket_responses e ticket_attachments denormalizam org_id do ticket pai (mesmo
-- padrão de anamnesis_form_versions/service_media) para RLS sem join; são append-only
-- (sem policy de UPDATE/DELETE) — correção de resposta vira nova resposta, não edição.
CREATE TYPE "public"."ticket_status" AS ENUM ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed');
--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM ('low', 'normal', 'high', 'urgent');
--> statement-breakpoint
CREATE TYPE "public"."ticket_author_type" AS ENUM ('customer', 'agent', 'system');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "category_id" uuid NOT NULL REFERENCES "ticket_categories"("id") ON DELETE RESTRICT,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "requester_name" text NOT NULL,
  "requester_email" text NOT NULL,
  "subject" text NOT NULL,
  "description" text NOT NULL,
  "status" "ticket_status" NOT NULL DEFAULT 'open',
  "priority" "ticket_priority" NOT NULL DEFAULT 'normal',
  "assigned_agent_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "first_response_at" timestamptz,
  "resolved_at" timestamptz,
  "closed_at" timestamptz,
  "reopened_at" timestamptz,
  "sla_first_response_due_at" timestamptz NOT NULL,
  "sla_resolution_due_at" timestamptz NOT NULL,
  "sla_first_response_breached_at" timestamptz,
  "sla_resolution_breached_at" timestamptz,
  "sla_warning_notified_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "tickets_org_id_status_idx" ON "tickets" USING btree ("org_id","status");
--> statement-breakpoint
CREATE INDEX "tickets_org_id_created_at_idx" ON "tickets" USING btree ("org_id","created_at" DESC);
--> statement-breakpoint
-- Índice parcial para o cron de SLA: só tickets sem primeira resposta e ainda não
-- marcados como violados precisam ser varridos a cada tick.
CREATE INDEX "tickets_sla_first_response_due_at_idx" ON "tickets" USING btree ("sla_first_response_due_at")
  WHERE "first_response_at" IS NULL AND "sla_first_response_breached_at" IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_id" uuid NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "author_type" "ticket_author_type" NOT NULL,
  "author_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "body" text NOT NULL,
  "is_internal_note" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "ticket_responses_ticket_id_created_at_idx" ON "ticket_responses" USING btree ("ticket_id","created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_id" uuid NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
  "response_id" uuid REFERENCES "ticket_responses"("id") ON DELETE CASCADE,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "storage_path" text NOT NULL,
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "uploaded_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.ticket_responses ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- RLS POLICIES — tickets
CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
-- RLS POLICIES — ticket_responses (append-only: sem UPDATE, sem DELETE)
CREATE POLICY "ticket_responses_select" ON public.ticket_responses
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "ticket_responses_insert" ON public.ticket_responses
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
-- RLS POLICIES — ticket_attachments (append-only: sem UPDATE, sem DELETE)
CREATE POLICY "ticket_attachments_select" ON public.ticket_attachments
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "ticket_attachments_insert" ON public.ticket_attachments
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));
