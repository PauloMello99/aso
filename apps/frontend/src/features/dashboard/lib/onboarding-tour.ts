import { ORG_NAV_SECTIONS, canAccessModule, type NavItem } from "./nav"
import type { OrgSummary } from "../hooks/use-orgs"

export interface TourStep {
  selector: string | null
  title: string
  description: string
}

const NAV_STEP_DESCRIPTIONS: Record<string, string> = {
  overview: "Veja um resumo do dia a dia da sua organização.",
  services: "Registre atendimentos e acompanhe pagamentos.",
  clients: "Gerencie o cadastro e o histórico dos seus clientes.",
  schedule: "Organize horários e compromissos da equipe.",
  stock: "Controle materiais e itens disponíveis no estoque.",
  cashier: "Acompanhe entradas, saídas e saldo do caixa.",
  settings: "Ajuste preferências da organização e da sua conta.",
}

function getNavStepDescription(item: NavItem): string {
  return (
    NAV_STEP_DESCRIPTIONS[item.href] ?? `Acesse a área de ${item.label.toLowerCase()}.`
  )
}

function isNavItemVisible(item: NavItem, org: OrgSummary): boolean {
  return (
    (!item.roles || item.roles.includes(org.role)) &&
    canAccessModule(org.role, org.permissions, item.module)
  )
}

export function getTourSteps(org: OrgSummary): TourStep[] {
  const navItems = ORG_NAV_SECTIONS.flatMap((section) => section.items).filter((item) =>
    isNavItemVisible(item, org),
  )

  const navSteps: TourStep[] = navItems.map((item) => ({
    selector: `[data-tour="nav-${item.href}"]`,
    title: item.label,
    description: getNavStepDescription(item),
  }))

  return [
    {
      selector: null,
      title: "Bem-vindo(a) ao ink-ops",
      description:
        "Vamos fazer um tour rápido pelas áreas principais da sua organização.",
    },
    ...navSteps,
    {
      selector: '[data-tour="user-menu"]',
      title: "Precisa rever?",
      description:
        "Você pode rever este tour a qualquer momento em \"Minha Conta\".",
    },
  ]
}
