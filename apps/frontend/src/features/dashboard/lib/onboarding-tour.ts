import { ORG_NAV_SECTIONS, canAccessModule, type NavItem } from "./nav"
import type { OrgSummary } from "../hooks/use-orgs"

/**
 * Um passo do tour de onboarding. `selector: null` = popover central sem elemento
 * ancorado (usado para boas-vindas/despedida); demais passos apontam para um item de
 * navegação via `data-tour`.
 */
export interface TourStep {
  selector: string | null
  title: string
  description: string
}

/**
 * Descrição curta por item de navegação, usada como corpo do passo do tour. Chave =
 * `NavItem.href`. Itens sem entrada aqui não deveriam existir em `ORG_NAV_SECTIONS`,
 * mas caem num fallback genérico para nunca deixar a descrição vazia.
 */
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

/** Mesmo filtro de visibilidade usado por `org-sidebar.tsx` para os itens de nav. */
function isNavItemVisible(item: NavItem, org: OrgSummary): boolean {
  return (
    (!item.roles || item.roles.includes(org.role)) &&
    canAccessModule(org.role, org.permissions, item.module)
  )
}

/**
 * Monta os passos do tour de onboarding para a organização atual: boas-vindas, um
 * passo por item de navegação visível para o papel/permissões do usuário (mesma regra
 * de `org-sidebar.tsx`), e despedida apontando para o menu do usuário. Função pura —
 * sem `driver.js`, sem DOM, sem hooks.
 */
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
