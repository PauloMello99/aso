import {
  LayoutGrid,
  Package,
  Users,
  CalendarDays,
  Archive,
  Wallet,
  Settings,
  CreditCard,
  ClipboardList,
  LifeBuoy,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export const MODULE_KEYS = [
  "services",
  "clients",
  "schedule",
  "stock",
  "cashier",
] as const
export type ModuleKey = (typeof MODULE_KEYS)[number]

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value)
}

export function canAccessModule(
  role: "owner" | "employee",
  permissions: readonly string[],
  module?: ModuleKey,
): boolean {
  if (!module) return true
  return role === "owner" || permissions.includes(module)
}

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  roles?: Array<"owner" | "employee">
  module?: ModuleKey
}

export interface NavSection {
  label?: string
  items: NavItem[]
}

export const ORG_NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "overview", icon: LayoutGrid },
      { label: "Serviços", href: "services", icon: Package, module: "services" },
      {
        label: "Anamnese",
        href: "anamnesis",
        icon: ClipboardList,
        module: "services",
      },
      { label: "Clientes", href: "clients", icon: Users, module: "clients" },
      { label: "Agenda", href: "schedule", icon: CalendarDays, module: "schedule" },
      { label: "Estoque", href: "stock", icon: Archive, module: "stock" },
      { label: "Caixa", href: "cashier", icon: Wallet, module: "cashier" },
    ],
  },
  {
    label: "Configurações",
    items: [{ label: "Configurações", href: "settings", icon: Settings }],
  },
  {
    items: [{ label: "Suporte", href: "support", icon: LifeBuoy }],
  },
]

export const SETTINGS_NAV: NavItem[] = [
  { label: "Geral", href: "settings/general", icon: Settings, roles: ["owner"] },
  { label: "Agenda", href: "settings/agenda", icon: CalendarDays },
  { label: "Estoque", href: "settings/stock", icon: Archive, roles: ["owner"] },
  { label: "Caixa", href: "settings/cashier", icon: Wallet, roles: ["owner"] },
  { label: "Assinatura", href: "settings/subscription", icon: CreditCard, roles: ["owner"] },
]

const OWNER_ONLY_PATHS: readonly string[] = [
  ...ORG_NAV_SECTIONS.flatMap((s) => s.items),
  ...SETTINGS_NAV,
]
  .filter((item) => item.roles && !item.roles.includes("employee"))
  .map((item) => item.href)

export function getModuleForPath(subpath: string): ModuleKey | undefined {
  const seg = subpath.split("/")[0] ?? ""
  const item = ORG_NAV_SECTIONS.flatMap((s) => s.items).find(
    (i) => i.href === seg,
  )
  return item?.module
}

export function isOwnerOnlyPath(subpath: string): boolean {
  return OWNER_ONLY_PATHS.some(
    (p) => subpath === p || subpath.startsWith(p + "/"),
  )
}

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
  anamnesis: "Anamnese",
  subscription: "Assinatura",
  organizations: "Organizações",
  support: "Suporte",
}
