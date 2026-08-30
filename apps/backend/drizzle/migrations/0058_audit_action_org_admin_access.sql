-- 0058 — Novo valor de enum para auditoria do acesso de super_admin a uma organização
-- via deep-link (síntese de owner, ADR-0013). ALTER TYPE de um enum não pode rodar na
-- mesma transação que cria o tipo/tabela que o usa (precedente: migration 0031/0053/0055/0057),
-- por isso o valor novo de audit_action vai em migration separada.
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'org_admin_access';
