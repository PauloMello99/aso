-- 0045 — support_inbound_emails: tabela de dedupe do webhook de e-mail recebido
-- (Resend pode reenviar o mesmo evento em retry). Antes de qualquer lógica de
-- negócio, o handler tenta "reivindicar" o email_id via
-- INSERT INTO support_inbound_emails (email_id, ...) VALUES (...)
-- ON CONFLICT (email_id) DO NOTHING — se zero linhas afetadas, o evento já foi
-- processado e é ignorado. A UNIQUE em email_id É o mecanismo de dedupe, não
-- precisa de índice adicional para essa finalidade.
--
-- RLS: habilitada, mas DE PROPÓSITO SEM NENHUMA POLICY. Esta tabela é
-- puramente infraestrutura de idempotência do ingestor de e-mail-to-ticket —
-- não é dado de negócio visível a tenant nem a super_admin via app, só o
-- webhook handler (rodando via DRIZZLE_ADMIN/service_role, que faz bypass de
-- RLS) escreve/lê aqui. RLS habilitada + zero policies = deny-by-default para
-- qualquer role comum (app_user/authenticated/anon); ausência de policy é
-- decisão deliberada, não esquecimento. REVOKE abaixo é defesa em
-- profundidade adicional contra a Data API do Supabase (mesmo padrão da 0041
-- para tickets/ticket_responses/ticket_attachments).
CREATE TABLE IF NOT EXISTS "support_inbound_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_id" text NOT NULL,
	"message_id" text,
	"from_email" text NOT NULL,
	"to_email" text NOT NULL,
	"ticket_id" uuid REFERENCES "tickets"("id") ON DELETE SET NULL,
	"response_id" uuid REFERENCES "ticket_responses"("id") ON DELETE SET NULL,
	"outcome" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "support_inbound_emails_email_id_unique" UNIQUE("email_id")
);
--> statement-breakpoint

-- Índice em ticket_id: suporta a consulta futura "todos os e-mails que geraram
-- (ou tentaram gerar) este ticket", útil para debug/auditoria do ingestor.
-- Sem WHERE parcial — ticket_id é NULL na maioria das linhas de falha/rejeição
-- (e-mail que não casou com nenhum ticket), então um índice completo (não
-- parcial) é o correto aqui, ao contrário do índice órfão de tickets (0044)
-- onde o NULL era o caso raro/interessante.
CREATE INDEX "support_inbound_emails_ticket_id_idx" ON "support_inbound_emails" USING btree ("ticket_id");
--> statement-breakpoint

ALTER TABLE public.support_inbound_emails ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

REVOKE ALL ON public.support_inbound_emails FROM anon, authenticated;
