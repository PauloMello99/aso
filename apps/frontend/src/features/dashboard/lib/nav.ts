import {
  LayoutGrid,
  Package,
  Users,
  CalendarDays,
  UserCheck,
  Archive,
  Wallet,
  CreditCard,
  Settings,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface NavItem {
  /** Label displayed in sidebar and used in breadcrumbs */
  label: string
  /** Path relative to /dashboard/org/[orgId]/ — can include a slash, e.g. "settings/billing" */
  href: string
  icon: LucideIcon
}

export interface NavSection {
  /** Optional section header rendered above the items */
  label?: string
  items: NavItem[]
}

/** Main navigation + settings sections for the org sidebar */
export const ORG_NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "overview", icon: LayoutGrid },
      { label: "Serviços", href: "services", icon: Package },
      { label: "Clientes", href: "clients", icon: Users },
      { label: "Agenda", href: "schedule", icon: CalendarDays },
      { label: "Membros", href: "members", icon: UserCheck },
      { label: "Estoque", href: "stock", icon: Archive },
      { label: "Caixa", href: "cashier", icon: Wallet },
    ],
  },
  {
    label: "Configurações",
    items: [
      { label: "Cobrança", href: "settings/billing", icon: CreditCard },
      { label: "Geral", href: "settings/general", icon: Settings },
    ],
  },
]

/** Maps a path segment (or "settings/X") to a human-readable label for breadcrumbs */
export const PAGE_LABELS: Record<string, string> = {
  overview: "Overview",
  services: "Serviços",
  clients: "Clientes",
  schedule: "Agenda",
  members: "Membros",
  stock: "Estoque",
  cashier: "Caixa",
  settings: "Configurações",
  billing: "Cobrança",
  general: "Geral",
  organizations: "Organizações",
}
