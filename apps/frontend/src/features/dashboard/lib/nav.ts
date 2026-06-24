import {
  LayoutGrid,
  Package,
  Users,
  CalendarDays,
  Archive,
  Wallet,
  Settings,
  CreditCard,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface NavItem {
  /** Label displayed in sidebar and used in breadcrumbs */
  label: string
  /** Path relative to /dashboard/org/[orgSlug]/ — can include a slash, e.g. "settings/general" */
  href: string
  icon: LucideIcon
  /** When set, only users with one of these roles see this item. Omit = visible to all. */
  roles?: Array<"owner" | "employee">
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
      { label: "Estoque", href: "stock", icon: Archive },
      { label: "Caixa", href: "cashier", icon: Wallet },
    ],
  },
  {
    label: "Configurações",
    // Visível a todos: o funcionário acessa settings/agenda; o índice de settings
    // redireciona por papel (owner→general, funcionário→agenda).
    items: [{ label: "Configurações", href: "settings", icon: Settings }],
  },
]

/**
 * Sub-nav da página de configurações. `agenda` é acessível ao funcionário (configura
 * a própria agenda); o resto é owner-only. Fonte de verdade do que aparece no
 * OrgSettingsLayout e de quais settings/* são owner-only.
 */
export const SETTINGS_NAV: NavItem[] = [
  { label: "Geral", href: "settings/general", icon: Settings, roles: ["owner"] },
  { label: "Agenda", href: "settings/agenda", icon: CalendarDays },
  { label: "Estoque", href: "settings/stock", icon: Archive, roles: ["owner"] },
  { label: "Caixa", href: "settings/cashier", icon: Wallet, roles: ["owner"] },
  { label: "Assinatura", href: "settings/subscription", icon: CreditCard, roles: ["owner"] },
]

/**
 * Sub-paths (após orgSlug) owner-only, derivados das `roles` do nav principal +
 * settings sub-nav. Usado pelo OrgLayout para redirecionar um funcionário que tente
 * acessar essas rotas direto pela URL. `settings/agenda` (sem roles) fica de fora,
 * logo é acessível ao funcionário. A fonte de verdade de autorização continua sendo o
 * backend (OrgOwnerGuard); isto é só UX.
 */
const OWNER_ONLY_PATHS: readonly string[] = [
  ...ORG_NAV_SECTIONS.flatMap((s) => s.items),
  ...SETTINGS_NAV,
]
  .filter((item) => item.roles && !item.roles.includes("employee"))
  .map((item) => item.href)

export function isOwnerOnlyPath(subpath: string): boolean {
  return OWNER_ONLY_PATHS.some(
    (p) => subpath === p || subpath.startsWith(p + "/"),
  )
}

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
  agenda: "Agenda",
  subscription: "Assinatura",
  organizations: "Organizações",
}
