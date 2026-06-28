/**
 * Permissões de funcionário por **módulo** (on/off). O owner sempre tem acesso
 * total (estas permissões só se aplicam a `employee`). Quem tem acesso a um módulo
 * continua vendo só os próprios registros (escopo por funcionário já existente).
 *
 * As chaves espelham os hrefs do nav do frontend (services, clients, schedule,
 * stock, cashier) para mapeamento direto.
 */
export const MODULE_KEYS = [
  "services",
  "clients",
  "schedule",
  "stock",
  "cashier",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

/** Funcionário novo começa restrito: só o essencial. Owner libera o resto. */
export const DEFAULT_EMPLOYEE_PERMISSIONS: ModuleKey[] = ["services", "schedule"];

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}

/** Owner tem tudo; funcionário precisa do módulo na lista de permissões. */
export function hasModuleAccess(
  role: "owner" | "employee",
  permissions: readonly string[],
  module: ModuleKey,
): boolean {
  return role === "owner" || permissions.includes(module);
}
