-- 0082 — Bloco 5.2 fatia C: "changelog_notifications", log append-only de anúncios de
-- novidades por e-mail aos donos. (O opt-out vive em users, migration 0081.)
--
--   (a) REGRA DE RELEVÂNCIA VIGENTE: se um item do changelog é notificável DERIVA do
--       bump MAJOR/MINOR do semver de produto + o corte NOTIFY_FROM_VERSION (ADR-0031),
--       calculado em código a partir do registry — NÃO existe flag no banco. Esta tabela
--       só registra o que já foi anunciado a quem.
--   (b) Append-only (molde "campaign_sends" 0063 / ADR-0010): NUNCA UPDATE/DELETE. UMA
--       linha por (user_id, entry_id), terminal ('sent' ou 'failed'), inserida SÓ depois
--       da tentativa de envio. DIVERGÊNCIA DELIBERADA de 0063: SEM retry por tentativa
--       (não há coluna "attempt"). O UNIQUE (user_id, entry_id) é contrato de
--       idempotência de LINHA, NÃO de e-mail: dois ticks sobrepostos podem enviar duas
--       vezes antes de qualquer um inserir. A serialização é responsabilidade do
--       use-case via "claimRun" (passo C6), não do banco.
--   (c) "entry_id" é o id textual do item no registry do changelog (não é FK). É metade
--       do contrato de dedupe: renomear um id reenvia a todos; reaproveitar um id antigo
--       suprime o envio silenciosamente.
--   (d) SEM FK para "users" por decisão (argumento (e) da 0063): log histórico de
--       comunicação; CASCADE destruiria a prova do envio e RESTRICT bloquearia a
--       eliminação do usuário (LGPD). Orfanar "user_id" = pseudonimização.
--       INVARIANTE: essa decisão só vale se NENHUMA coluna carregar PII. Em particular,
--       "error" guarda APENAS classe/código de falha REDIGIDO — NUNCA o payload/mensagem
--       do provedor (pode ecoar o e-mail do destinatário). Implementado em C3.
--   (e) Uma linha 'failed' é DEFINITIVA: indisponibilidade do provedor suprime aquele
--       release para aquele usuário. Perda aceita; sem DELETE manual (append-only).
--   (f) RLS habilitado SEM nenhuma policy: só DRIZZLE_ADMIN (bypassrls) lê/escreve. O
--       REVOKE é defesa em profundidade (convenção 0041/0045/0051/0052/0060/0063).
--   (g) Sem índice em "entry_id": sem consumidor; o UNIQUE (user_id, entry_id) já serve
--       o anti-join por user_id + entry_id.
--
-- AVISO CRÍTICO: o rollback apaga o log de dedupe e o PRÓXIMO TICK REENVIA todo item
-- notificável a todos os donos elegíveis. Em produção, desligar via kill-switch
-- CHANGELOG_ANNOUNCEMENTS_ENABLED em vez de fazer rollback.
CREATE TYPE public.changelog_notification_status AS ENUM ('sent', 'failed');
--> statement-breakpoint
CREATE TABLE public.changelog_notifications (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_id" text NOT NULL,
	"status" public.changelog_notification_status NOT NULL,
	"error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "changelog_notifications_user_entry_uq" UNIQUE ("user_id", "entry_id"),
	CONSTRAINT "changelog_notifications_sent_at_check" CHECK ((("status" = 'sent') AND ("sent_at" IS NOT NULL) AND ("error" IS NULL)) OR (("status" = 'failed') AND ("sent_at" IS NULL)))
);
--> statement-breakpoint
ALTER TABLE public.changelog_notifications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- SEM nenhuma policy (intencional, ver (f)): tabela administrativa, só DRIZZLE_ADMIN.
REVOKE ALL ON public.changelog_notifications FROM anon, authenticated;
