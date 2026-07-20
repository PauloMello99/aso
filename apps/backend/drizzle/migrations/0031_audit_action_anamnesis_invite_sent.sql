-- 0031 — Novo valor de enum para auditoria do envio de convite de anamnese (M10b).
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'anamnesis_invite_sent';
