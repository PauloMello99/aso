import { canAccessModule } from "@/features/dashboard/lib/nav"

export interface OverviewVisibility {
  services: boolean
  schedule: boolean
  stock: boolean
  cashier: boolean
  clients: boolean
  hasAnyCard: boolean
}

export function overviewVisibility(
  role: "owner" | "employee",
  permissions: readonly string[],
): OverviewVisibility {
  const services = canAccessModule(role, permissions, "services")
  const schedule = canAccessModule(role, permissions, "schedule")
  const stock = canAccessModule(role, permissions, "stock")
  const cashier = canAccessModule(role, permissions, "cashier")
  const clients = canAccessModule(role, permissions, "clients")

  return {
    services,
    schedule,
    stock,
    cashier,
    clients,
    hasAnyCard: services || schedule || stock || cashier || clients,
  }
}
