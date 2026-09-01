-- 0063 — T6 Bloco A (fatia 1): enums de campanha + "campaign_sends", o log append-only
-- de tentativas de envio das campanhas de e-mail por gatilho. Sem entity/repo/use-case
-- ainda.
--
--   (a) Append-only PURO (D2, mesmo espírito do caixa, ADR-0010): UMA LINHA POR
--       (tentativa, status terminal). NUNCA UPDATE/DELETE. O writer (fatia 3) chama o
--       sender e SÓ ENTÃO insere UMA linha terminal ('sent' ou 'failed') para aquela
--       tentativa — não existe estado 'pending'. Um retry insere uma linha NOVA com
--       "attempt" incrementado e status 'failed'/'sent'. 'bounced' é uma linha
--       ADICIONAL registrada após um 'sent' (webhook de bounce futuro, fora do MVP —
--       o schema já suporta).
--   (b) "dedupe_key" é o contrato de idempotência entre a query de gatilho e este log:
--         post_service:<service_id>
--         birthday:<customer_id>:<YYYY>
--         inactivity:<customer_id>:<YYYY-MM>
--       Todo formato de "dedupe_key" DEVE embutir um identificador globalmente único
--       (UUID: service_id ou customer_id). Um identificador local à org quebraria o
--       UNIQUE global entre tenants. A query de gatilho faz anti-join por QUALQUER
--       linha com o "dedupe_key" (não só a última): se existe uma linha, o gatilho já
--       foi processado naquela janela.
--   (c) Retry: só a passe de retry reprocessa gatilhos cuja ÚLTIMA linha é 'failed'
--       (índice parcial "campaign_sends_retriable_idx"), inserindo uma linha nova com
--       "attempt" incrementado. 'sent' e 'bounced' são terminais — nunca disparam
--       retry. Nada é atualizado: o histórico de tentativas fica todo materializado
--       em linhas.
--   (d) "org_id" é NOT NULL aqui (ao contrário de "billing_refund_events"."org_id",
--       que é nullable): a origem de cada linha é a NOSSA query de gatilho, que já
--       parte de customers/services com "org_id" garantido — não é um webhook externo
--       que pode chegar antes de a org existir no nosso banco.
--   (e) SEM FK para "organizations"/"customers" por decisão: "campaign_sends" é log
--       histórico de comunicação; ON DELETE CASCADE destruiria a prova do envio (a
--       razão da tabela existir), e ON DELETE RESTRICT/NO ACTION bloquearia a exclusão
--       do cliente/org — colisão com o direito de eliminação da LGPD. Orfanar
--       "customer_id"/"org_id" ao apagar o cliente = pseudonimização (UUID pendurado,
--       sem valor identificante), que é o comportamento desejado. Como NÃO há FK NEM
--       RLS aqui (só DRIZZLE_ADMIN escreve), a integridade de (org_id, customer_id) é
--       responsabilidade da QUERY de gatilho: "org_id" e "customer_id" DEVEM ser
--       projetados da MESMA linha de customers/services que originou o gatilho — nunca
--       de contexto de request nem de fontes separadas.
--   (f) RLS habilitado SEM nenhuma policy: log puramente administrativo, só
--       DRIZZLE_ADMIN (bypassrls) lê/escreve. O REVOKE é defesa em profundidade.
CREATE TYPE public.campaign_trigger_type AS ENUM ('post_service', 'birthday', 'inactivity');
--> statement-breakpoint
CREATE TYPE public.campaign_send_status AS ENUM ('sent', 'failed', 'bounced');
--> statement-breakpoint
CREATE TABLE public.campaign_sends (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"trigger" public.campaign_trigger_type NOT NULL,
	"status" public.campaign_send_status NOT NULL,
	"attempt" integer NOT NULL DEFAULT 1,
	"dedupe_key" text NOT NULL,
	"error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_sends_dedupe_attempt_status_uq" UNIQUE ("dedupe_key", "attempt", "status"),
	CONSTRAINT "campaign_sends_attempt_check" CHECK ("attempt" >= 1),
	CONSTRAINT "campaign_sends_sent_at_check" CHECK ((("status" = 'sent') AND ("sent_at" IS NOT NULL)) OR ("status" = 'bounced') OR (("status" = 'failed') AND ("sent_at" IS NULL)))
);
--> statement-breakpoint
CREATE INDEX "campaign_sends_org_created_idx" ON public.campaign_sends ("org_id","created_at" DESC);
--> statement-breakpoint
CREATE INDEX "campaign_sends_retriable_idx" ON public.campaign_sends ("dedupe_key") WHERE "status" = 'failed';
--> statement-breakpoint
ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- SEM nenhuma policy (intencional, ver decisão (f)): tabela administrativa, só
-- DRIZZLE_ADMIN lê/escreve. RLS habilitado sem policy nega tudo para roles
-- NOBYPASSRLS. O REVOKE é defesa em profundidade (convenção das migrations
-- 0041/0045/0051/0052/0060).
REVOKE ALL ON public.campaign_sends FROM anon, authenticated;
