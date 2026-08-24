-- 0055 — Novos valores de enum para auditoria do reenvio de convite de anamnese e do
-- envio de cópia da anamnese preenchida. ALTER TYPE de um enum não pode rodar na mesma
-- transação que cria o tipo/tabela que o usa (precedente: migration 0031/0053), por isso
-- os 2 valores novos de audit_action vão em migration separada.
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'anamnesis_invite_resent';
--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'anamnesis_copy_sent';
