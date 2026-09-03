-- 0066 — T6 rework (fatia 1): "campaigns" — CRUD de campanhas de e-mail por gatilho.
-- Substitui "org_campaign_settings" (0062, 1 linha/org, colunas por gatilho) por uma
-- tabela com N linhas/org, UMA por gatilho. A 0062 NÃO é editada (fica no histórico);
-- ela é dropada por uma migration 0067 separada, numa fatia posterior. O enum
-- "public.campaign_trigger_type" ('post_service'|'birthday'|'inactivity') já existe desde
-- a 0063 — esta migration só o referencia (nenhum CREATE/ALTER TYPE aqui), então roda
-- inteira em uma única transação.
--
--   (a) UNIQUE ("org_id", "trigger"): no máximo UMA campanha por gatilho por org (D1).
--       O índice do UNIQUE tem "org_id" como coluna líder, então também serve a query de
--       lista da tela (WHERE org_id = ...).
--   (b) Sem backfill: nenhuma linha é criada por esta migration. Cada org começa com
--       ZERO campanhas; o dono cria cada campanha explicitamente numa fatia posterior.
--   (c) "subject"/"body" NULLABLE. NULL = usa o texto default autoral do produto para
--       aquele gatilho. Valor preenchido = override do dono da org. O CHECK de "subject"
--       usa btrim com set explícito (E' \t\n\r') para rejeitar valor só de espaço em
--       branco/quebra de linha, e ainda limita o comprimento BRUTO (não aparado) ao teto.
--       Esse guard forte no banco COMPLEMENTA — não substitui — a normalização/trim que
--       a camada de aplicação aplica antes de gravar.
--   (d) O texto é do dono da org, mas o envio é "em nome do ASO": o rodapé
--       (identificação do remetente + link de descadastro) é fixo e NÃO editável —
--       de propósito não há coluna para ele aqui.
--   (e) A policy de UPDATE carrega WITH CHECK idêntico ao USING (e ao WITH CHECK do
--       INSERT): "org_id" é a chave de tenancy, então sem o WITH CHECK um owner da org A
--       poderia fazer UPDATE ... SET org_id = <org B> e a linha nova nunca seria
--       reavaliada.
--   (f) HÁ policy de DELETE aqui (não havia na 0062): na 0062 "desligar" uma campanha era
--       setar uma flag *_enabled para false, nunca apagar a linha. Aqui a campanha é o
--       próprio objeto do CRUD, então excluir é uma operação de primeira classe
--       (owner-only, mesmo predicado do INSERT/UPDATE).
CREATE TABLE public.campaigns (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES public.organizations("id") ON DELETE CASCADE,
	"trigger" public.campaign_trigger_type NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean NOT NULL DEFAULT false,
	"subject" text,
	"body" jsonb,
	"inactivity_months" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_org_trigger_uq" UNIQUE ("org_id", "trigger"),
	CONSTRAINT "campaigns_name_check" CHECK (char_length(btrim("name", E' \t\n\r')) BETWEEN 1 AND 80 AND char_length("name") <= 80),
	CONSTRAINT "campaigns_subject_check" CHECK ("subject" IS NULL OR (char_length(btrim("subject", E' \t\n\r')) BETWEEN 1 AND 200 AND char_length("subject") <= 200)),
	-- octet_length(body::text) (nao pg_column_size): mede o JSON serializado em bytes, a
	-- MESMA unidade que a camada de aplicacao consegue espelhar; jsonb_out e IMMUTABLE.
	CONSTRAINT "campaigns_body_size_check" CHECK ("body" IS NULL OR octet_length("body"::text) <= 65536),
	CONSTRAINT "campaigns_body_shape_check" CHECK ("body" IS NULL OR jsonb_typeof("body") = 'object'),
	-- Bidirecional: 'inactivity' EXIGE inactivity_months 1..36; os demais gatilhos EXIGEM
	-- inactivity_months NULL (o guard forte no banco complementa a normalizacao da aplicacao).
	CONSTRAINT "campaigns_inactivity_months_check" CHECK (CASE WHEN "trigger" = 'inactivity' THEN "inactivity_months" BETWEEN 1 AND 36 ELSE "inactivity_months" IS NULL END)
);
--> statement-breakpoint
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "campaigns_select" ON public.campaigns
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "campaigns_insert" ON public.campaigns
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));
--> statement-breakpoint
CREATE POLICY "campaigns_update" ON public.campaigns
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_owner(org_id))
  WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));
--> statement-breakpoint
CREATE POLICY "campaigns_delete" ON public.campaigns
  FOR DELETE USING (public.is_super_admin() OR public.is_org_owner(org_id));
--> statement-breakpoint
REVOKE ALL ON public.campaigns FROM anon, authenticated;
