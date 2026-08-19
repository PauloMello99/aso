-- 0052 — auto-cadastro/atualização de cliente via link público (M-self-service).
--
-- Decisões não óbvias:
--   (a) customer_self_registrations carrega email/org_id/service_type_id ANTES de
--       existir um customer: o convite é enviado para um e-mail que ainda não tem
--       cadastro no sistema. anamnesis_response_id aponta para uma linha PENDENTE de
--       anamnesis_responses (customer_id NULL nessa linha, também criada no momento do
--       convite), reaproveitando o motor de anamnese/link público já existente
--       (migration 0030) em vez de duplicar a lógica de token/expiração/assinatura só
--       para este fluxo. customer_id nesta tabela só é preenchido no submit, quando o
--       cliente é finalmente criado.
--   (b) Ausência deliberada de policy de UPDATE/DELETE nas duas tabelas (mesmo padrão
--       de anamnesis_responses, migration 0030): a transição pending -> submitted é
--       sempre feita por DRIZZLE_ADMIN durante o submit do link público (sem sessão de
--       usuário autenticado), nunca por um app_user comum. RLS sem policy de
--       UPDATE/DELETE já bloqueia por padrão.
--   (c) Índices únicos PARCIAIS (WHERE status='pending'): só um convite pendente por
--       e-mail por org em customer_self_registrations, e só um convite pendente por
--       cliente em customer_update_invitations — evita múltiplos links ativos
--       simultâneos para o mesmo destinatário.
--   (d) Policy de DELETE restrita a status='pending' (nas duas tabelas): sem ela, um
--       convite EXPIRADO mas nunca submetido ficaria com status='pending' para sempre
--       (a única transição de status é via DRIZZLE_ADMIN no submit público), bloqueando
--       PERMANENTEMENTE o reenvio de convite pelo índice único parcial acima. O use-case
--       de reenviar convite deve DELETAR a linha pendente existente (via DRIZZLE normal,
--       autenticado, sem precisar de DRIZZLE_ADMIN) antes de inserir uma nova. Linhas
--       'submitted' continuam indeletáveis (nenhuma policy cobre esse estado).
--   (e) customers(id, org_id) UNIQUE + FK composta (customer_id, org_id) NAS DUAS
--       tabelas: sem isso, nada no banco impediria um app_user inserir customer_id de
--       OUTRA org (a policy de INSERT só valida org_id, não a relação entre as duas
--       colunas), e o submit público roda via DRIZZLE_ADMIN (sem RLS como rede de
--       segurança). Postgres 15+ suporta lista de colunas em "ON DELETE SET NULL (col)"
--       para FK composta — por isso customer_self_registrations também leva a FK
--       composta, com SET NULL restrito à coluna customer_id (org_id nunca é afetado).
ALTER TABLE "customers" ADD CONSTRAINT "customers_id_org_id_uq" UNIQUE ("id", "org_id");
--> statement-breakpoint
CREATE TABLE "customer_self_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"service_type_id" uuid REFERENCES "service_types"("id") ON DELETE SET NULL,
	"email" text NOT NULL,
	"token" text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
	"anamnesis_response_id" uuid REFERENCES "anamnesis_responses"("id") ON DELETE SET NULL,
	"customer_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL DEFAULT now() + interval '7 days',
	"submitted_at" timestamp with time zone,
	"created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_self_registrations_status_check" CHECK ("status" IN ('pending','submitted')),
	CONSTRAINT "customer_self_registrations_status_submitted_at_check" CHECK (("status" = 'pending' AND "submitted_at" IS NULL) OR ("status" = 'submitted' AND "submitted_at" IS NOT NULL)),
	CONSTRAINT "customer_self_registrations_customer_org_fk" FOREIGN KEY ("customer_id", "org_id") REFERENCES "customers"("id", "org_id") ON DELETE SET NULL ("customer_id")
);
--> statement-breakpoint
CREATE TABLE "customer_update_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"customer_id" uuid NOT NULL,
	"token" text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL DEFAULT now() + interval '7 days',
	"submitted_at" timestamp with time zone,
	"created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_update_invitations_status_check" CHECK ("status" IN ('pending','submitted')),
	CONSTRAINT "customer_update_invitations_status_submitted_at_check" CHECK (("status" = 'pending' AND "submitted_at" IS NULL) OR ("status" = 'submitted' AND "submitted_at" IS NOT NULL)),
	CONSTRAINT "customer_update_invitations_customer_org_fk" FOREIGN KEY ("customer_id", "org_id") REFERENCES "customers"("id", "org_id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "customer_self_registrations_org_idx" ON "customer_self_registrations" ("org_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "customer_self_registrations_org_email_pending_uq" ON "customer_self_registrations" ("org_id", lower(btrim("email"))) WHERE "status" = 'pending';
--> statement-breakpoint
CREATE UNIQUE INDEX "customer_self_registrations_anamnesis_response_id_uq" ON "customer_self_registrations" ("anamnesis_response_id") WHERE "anamnesis_response_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "customer_update_invitations_org_idx" ON "customer_update_invitations" ("org_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "customer_update_invitations_customer_pending_uq" ON "customer_update_invitations" ("customer_id") WHERE "status" = 'pending';
--> statement-breakpoint
ALTER TABLE public.customer_self_registrations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.customer_update_invitations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "customer_self_registrations_select" ON public.customer_self_registrations
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "customer_self_registrations_insert" ON public.customer_self_registrations
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "customer_self_registrations_delete" ON public.customer_self_registrations
  FOR DELETE USING ((public.is_super_admin() OR public.is_org_member(org_id)) AND status = 'pending');
--> statement-breakpoint
CREATE POLICY "customer_update_invitations_select" ON public.customer_update_invitations
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "customer_update_invitations_insert" ON public.customer_update_invitations
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "customer_update_invitations_delete" ON public.customer_update_invitations
  FOR DELETE USING ((public.is_super_admin() OR public.is_org_member(org_id)) AND status = 'pending');
--> statement-breakpoint
-- SEM UPDATE (intencional, ver decisão (b) no cabeçalho): a transição pending ->
-- submitted roda sempre via DRIZZLE_ADMIN (link público, sem sessão de usuário
-- autenticado), nunca por um app_user comum. DELETE é permitido só para status='pending'
-- (decisão (d)) — linhas 'submitted' continuam indeletáveis por ausência de policy.

-- Defesa em profundidade (mesmo padrão da 0041/0051): RLS já é a proteção primária,
-- mas a Data API do Supabase concede GRANT por padrão a anon/authenticated — reduzir a
-- superfície é barato.
REVOKE ALL ON public.customer_self_registrations, public.customer_update_invitations FROM anon, authenticated;
