-- 0017 — Permissões granulares por funcionário (PERM-1).
-- Lista de módulos liberados ao funcionário (on/off). Owner ignora (acesso total).
-- Membros existentes começam vazios (restrito); o owner libera os módulos.
ALTER TABLE "org_memberships"
  ADD COLUMN IF NOT EXISTS "permissions" text[] NOT NULL DEFAULT '{}';
