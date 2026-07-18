export const MODULE_KEYS = [
  "services",
  "clients",
  "schedule",
  "stock",
  "cashier",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const DEFAULT_EMPLOYEE_PERMISSIONS: ModuleKey[] = ["services", "schedule"];

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}

export function hasModuleAccess(
  role: "owner" | "employee",
  permissions: readonly string[],
  module: ModuleKey,
): boolean {
  return role === "owner" || permissions.includes(module);
}
