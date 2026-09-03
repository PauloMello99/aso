-- 0062 — T6 Bloco A (fatia 1): "org_campaign_settings" — o liga/desliga por org das
-- campanhas de e-mail por gatilho, com copy (assunto/corpo) custom por gatilho (D5).
-- Sem entity/repo/use-case ainda; o dono da org configura no Bloco B.
--
--   (a) Ausência de linha = campanhas DESLIGADAS para a org. As queries de gatilho
--       fazem INNER JOIN com esta tabela (NUNCA LEFT) — sem linha, nenhum cliente da
--       org entra na seleção de envio.
--   (b) Sem backfill: nenhuma linha é criada por esta migration. O dono liga
--       explicitamente no Bloco B.
--   (c) Colunas de texto (assunto/corpo) NULLABLE. NULL = usa o texto default autoral
--       do produto para aquele gatilho. Valor preenchido = override do dono da org.
--       Os CHECKs usam btrim com set explícito (E' \t\n\r') para rejeitar valor só de
--       espaço em branco/quebra de linha, e ainda limitam o comprimento BRUTO (não
--       aparado) ao teto. Esse guard forte no banco COMPLEMENTA — não substitui — a
--       normalização/trim que a fatia 3 aplica antes de gravar.
--   (d) O texto é do dono da org, mas o envio é "em nome do ASO": o rodapé
--       (identificação do remetente + link de descadastro) é fixo e NÃO editável —
--       de propósito não há coluna para ele aqui.
--   (e) A policy de UPDATE carrega WITH CHECK idêntico ao USING (e ao WITH CHECK do
--       INSERT): "org_id" é a PK e a chave de tenancy ao mesmo tempo, então sem o
--       WITH CHECK um owner da org A poderia fazer UPDATE ... SET org_id = <org B>
--       e a linha nova nunca seria reavaliada.
CREATE TABLE public.org_campaign_settings (
	"org_id" uuid PRIMARY KEY REFERENCES public.organizations("id") ON DELETE CASCADE,
	"post_service_enabled" boolean NOT NULL DEFAULT false,
	"birthday_enabled" boolean NOT NULL DEFAULT false,
	"inactivity_enabled" boolean NOT NULL DEFAULT false,
	"inactivity_months" integer NOT NULL DEFAULT 6,
	"post_service_subject" text,
	"post_service_body" text,
	"birthday_subject" text,
	"birthday_body" text,
	"inactivity_subject" text,
	"inactivity_body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_campaign_settings_inactivity_months_check" CHECK ("inactivity_months" BETWEEN 1 AND 36),
	CONSTRAINT "org_campaign_settings_post_service_subject_check" CHECK ("post_service_subject" IS NULL OR (char_length(btrim("post_service_subject", E' \t\n\r')) BETWEEN 1 AND 200 AND char_length("post_service_subject") <= 200)),
	CONSTRAINT "org_campaign_settings_birthday_subject_check" CHECK ("birthday_subject" IS NULL OR (char_length(btrim("birthday_subject", E' \t\n\r')) BETWEEN 1 AND 200 AND char_length("birthday_subject") <= 200)),
	CONSTRAINT "org_campaign_settings_inactivity_subject_check" CHECK ("inactivity_subject" IS NULL OR (char_length(btrim("inactivity_subject", E' \t\n\r')) BETWEEN 1 AND 200 AND char_length("inactivity_subject") <= 200)),
	CONSTRAINT "org_campaign_settings_post_service_body_check" CHECK ("post_service_body" IS NULL OR (char_length(btrim("post_service_body", E' \t\n\r')) BETWEEN 1 AND 5000 AND char_length("post_service_body") <= 5000)),
	CONSTRAINT "org_campaign_settings_birthday_body_check" CHECK ("birthday_body" IS NULL OR (char_length(btrim("birthday_body", E' \t\n\r')) BETWEEN 1 AND 5000 AND char_length("birthday_body") <= 5000)),
	CONSTRAINT "org_campaign_settings_inactivity_body_check" CHECK ("inactivity_body" IS NULL OR (char_length(btrim("inactivity_body", E' \t\n\r')) BETWEEN 1 AND 5000 AND char_length("inactivity_body") <= 5000))
);
--> statement-breakpoint
ALTER TABLE public.org_campaign_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "org_campaign_settings_select" ON public.org_campaign_settings
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "org_campaign_settings_insert" ON public.org_campaign_settings
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));
--> statement-breakpoint
CREATE POLICY "org_campaign_settings_update" ON public.org_campaign_settings
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_owner(org_id))
  WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));
--> statement-breakpoint
-- SEM policy de DELETE (intencional): desligar campanha é setar as flags *_enabled
-- para false, nunca apagar a linha. O REVOKE é defesa em profundidade (convenção das
-- migrations 0041/0045/0051/0052).
REVOKE ALL ON public.org_campaign_settings FROM anon, authenticated;
