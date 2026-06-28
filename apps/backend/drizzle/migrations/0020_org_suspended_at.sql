-- 0020 — Suspensão de organização pelo super_admin (PLAT-1).
-- `suspended_at` NULL = ativa; preenchido = suspensa (acesso bloqueado a todos
-- os membros; super_admin segue acessando). Enforce no OrgMembershipGuard.
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "suspended_at" timestamptz;
