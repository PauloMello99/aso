-- 0053 — Novos valores de enum para auditoria do fluxo de auto-cadastro/atualização de
-- cliente via link público (M-self-service). ALTER TYPE de um enum não pode rodar na
-- mesma transação que cria o tipo/tabela que o usa (precedente: migration 0031), por
-- isso os 4 valores novos de audit_action vão em migration separada da 0052.
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'customer_self_registration_invite_sent';
--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'customer_self_registered';
--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'customer_update_invite_sent';
--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'customer_self_updated';
