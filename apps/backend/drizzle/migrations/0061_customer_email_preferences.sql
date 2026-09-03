-- 0061 — T6 Bloco A (fatia 1): módulo de campanhas de e-mail por gatilho. Cria
-- "customer_email_preferences", o opt-out por cliente dos e-mails de campanha
-- (pós-atendimento, aniversário, inatividade). Não há entity/repo/use-case ainda —
-- as fatias seguintes plugam a persistência e o consumo pelo cron/link público.
--
--   (a) "unsubscribe_token" NÃO expira e é estável por (customer_id, org_id): é
--       gerado EXCLUSIVAMENTE pelo DEFAULT do banco (encode(gen_random_bytes(32),
--       'hex')) e NUNCA rotaciona. O token viaja dentro do link de descadastro de
--       e-mails já entregues; rotacioná-lo/invalidá-lo quebraria o "unsubscribe" de
--       uma mensagem já na caixa do cliente — falha de LGPD. Uma vez emitido, é
--       imutável.
--   (b) Ausência de linha para um cliente = ele NÃO optou por sair de nada; o envio
--       segue as flags da org ("org_campaign_settings", migration 0062). As três
--       flags *_enabled default true e "unsubscribed_all_at" NULL descrevem esse
--       estado quando a linha é criada sob demanda.
--   (c) FK COMPOSTA (customer_id, org_id) -> customers(id, org_id) via
--       "customers_id_org_id_uq" (migration 0052): impede a preferência apontar para
--       cliente de OUTRA org. "customer_id" não tem FK single-column.
--   (d) RLS habilitado com policy SÓ de SELECT (is_super_admin OR is_org_member).
--       SEM policy de INSERT/UPDATE/DELETE de propósito: toda escrita é feita pelo
--       cron de disparo ou pelo endpoint público de descadastro, ambos via
--       DRIZZLE_ADMIN (bypassrls). RLS sem policy de escrita já nega por padrão para
--       roles NOBYPASSRLS. Se o app_user autenticado precisar escrever aqui no
--       futuro, uma policy terá de ser adicionada — deixado em aberto.
CREATE TABLE public.customer_email_preferences (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES public.organizations("id") ON DELETE CASCADE,
	"customer_id" uuid NOT NULL,
	"unsubscribe_token" text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
	"post_service_enabled" boolean NOT NULL DEFAULT true,
	"birthday_enabled" boolean NOT NULL DEFAULT true,
	"inactivity_enabled" boolean NOT NULL DEFAULT true,
	"unsubscribed_all_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_email_preferences_customer_org_fk" FOREIGN KEY ("customer_id", "org_id") REFERENCES public.customers("id", "org_id") ON DELETE CASCADE,
	CONSTRAINT "customer_email_preferences_customer_org_uq" UNIQUE ("customer_id", "org_id")
);
--> statement-breakpoint
-- Sustenta o ON DELETE CASCADE do "org_id" (varre por org ao apagar a organização) e
-- listagens por org. O UNIQUE (customer_id, org_id) tem "customer_id" à esquerda, então
-- não serve de índice por "org_id". Convenção "*_org_idx" da migration 0052.
CREATE INDEX "customer_email_preferences_org_idx" ON public.customer_email_preferences ("org_id");
--> statement-breakpoint
ALTER TABLE public.customer_email_preferences ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "customer_email_preferences_select" ON public.customer_email_preferences
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
-- SEM policy de INSERT/UPDATE/DELETE (intencional, ver decisão (d) no cabeçalho): toda
-- escrita roda via DRIZZLE_ADMIN (cron de disparo e endpoint público de descadastro),
-- nunca por app_user autenticado. RLS sem policy já bloqueia por padrão. O REVOKE
-- abaixo é defesa em profundidade (convenção das migrations 0041/0045/0051/0052).
REVOKE ALL ON public.customer_email_preferences FROM anon, authenticated;
