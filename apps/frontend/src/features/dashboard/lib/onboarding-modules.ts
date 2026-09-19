import { ORG_NAV_SECTIONS, canAccessModule, type ModuleKey, type NavItem } from "./nav"
import type { OrgSummary } from "../hooks/use-orgs"

export interface TourStep {
  selector: string | null
  title: string
  description: string
}

export interface OnboardingModule {
  /** href de nav (nao ModuleKey: anamnesis e services compartilham module) */
  id: string
  version: number
  /** data ISO de introducao do modulo no tour */
  introducedAt: string
  requiredModule?: ModuleKey
  roles?: Array<"owner" | "employee">
  steps: TourStep[]
}

export interface OnboardingProgress {
  onboardingSeen?: Record<string, number> | null
  onboardingCompletedAt?: string | null
}

const NAV_STEP_DESCRIPTIONS: Record<string, string> = {
  overview: "Veja um resumo do dia a dia da sua organização.",
  services: "Registre atendimentos e acompanhe pagamentos.",
  clients: "Gerencie o cadastro e o histórico dos seus clientes.",
  schedule: "Organize horários e compromissos da equipe.",
  stock: "Controle materiais e itens disponíveis no estoque.",
  cashier: "Acompanhe entradas, saídas e saldo do caixa.",
  members: "Veja e gerencie os membros da organização.",
  settings: "Ajuste preferências da organização e da sua conta.",
  support: "Abra chamados e acompanhe o atendimento da nossa equipe.",
}

function getNavStepDescription(item: NavItem): string {
  return (
    NAV_STEP_DESCRIPTIONS[item.href] ?? `Acesse a área de ${item.label.toLowerCase()}.`
  )
}

/**
 * Metadados de versionamento do tour por id (href de nav). Uma entrada por item de nav.
 *
 * Modulo novo: adicione uma entrada com `introducedAt` = data/hora (ISO completo) do
 * deploy, POSTERIOR a qualquer conclusao de tour existente; nunca reutilize uma data
 * antiga, senao usuarios legados o leem como "ja visto". Um href de nav sem entrada
 * aqui lanca erro no carregamento do modulo (e o spec de contrato falha).
 *
 * Re-tour de modulo alterado: incremente `version` (usuarios com versao vista menor
 * voltam a ve-lo).
 */
export const ONBOARDING_MODULE_META: Record<
  string,
  { version: number; introducedAt: string }
> = {
  overview: { version: 1, introducedAt: "2026-07-17T00:00:00Z" },
  services: { version: 1, introducedAt: "2026-07-17T00:00:00Z" },
  anamnesis: { version: 1, introducedAt: "2026-07-17T00:00:00Z" },
  clients: { version: 1, introducedAt: "2026-07-17T00:00:00Z" },
  schedule: { version: 1, introducedAt: "2026-07-17T00:00:00Z" },
  stock: { version: 1, introducedAt: "2026-07-17T00:00:00Z" },
  cashier: { version: 1, introducedAt: "2026-07-17T00:00:00Z" },
  members: { version: 1, introducedAt: "2026-07-17T00:00:00Z" },
  campaigns: { version: 1, introducedAt: "2026-07-17T00:00:00Z" },
  settings: { version: 1, introducedAt: "2026-07-17T00:00:00Z" },
  support: { version: 1, introducedAt: "2026-07-17T00:00:00Z" },
}

export const ONBOARDING_MODULES: OnboardingModule[] = ORG_NAV_SECTIONS.flatMap(
  (section) => section.items,
).map((item) => {
  const meta = ONBOARDING_MODULE_META[item.href]
  if (!meta) {
    throw new Error(
      `onboarding-modules: item de nav "${item.href}" sem entrada em ONBOARDING_MODULE_META`,
    )
  }
  return {
    id: item.href,
    version: meta.version,
    introducedAt: meta.introducedAt,
    requiredModule: item.module,
    roles: item.roles,
    steps: [
      {
        selector: `[data-tour="nav-${item.href}"]`,
        title: item.label,
        description: getNavStepDescription(item),
      },
    ],
  }
})

export const TOUR_WELCOME_STEP: TourStep = {
  selector: null,
  title: "Bem-vindo(a) ao ASO",
  description:
    "Vamos fazer um tour rápido pelas áreas principais da sua organização.",
}

export const TOUR_NEWS_STEP: TourStep = {
  selector: null,
  title: "Novidades na sua organização",
  description: "Veja o que mudou desde a última vez que você fez o tour.",
}

export const TOUR_CLOSING_STEP: TourStep = {
  selector: '[data-tour="user-menu"]',
  title: "Precisa rever?",
  description: 'Você pode rever este tour a qualquer momento em "Minha Conta".',
}

export function isOnboardingModuleVisible(
  module: OnboardingModule,
  org: OrgSummary,
): boolean {
  return (
    (!module.roles || module.roles.includes(org.role)) &&
    canAccessModule(org.role, org.permissions, module.requiredModule)
  )
}

function isModuleSeen(
  module: OnboardingModule,
  { onboardingSeen, onboardingCompletedAt }: OnboardingProgress,
): boolean {
  const seenVersion = onboardingSeen?.[module.id]
  if (typeof seenVersion === "number" && seenVersion >= module.version) return true
  if (onboardingCompletedAt != null) {
    const completed = Date.parse(onboardingCompletedAt)
    const introduced = Date.parse(module.introducedAt)
    return introduced <= completed
  }
  return false
}

export function getPendingOnboardingModules(
  org: OrgSummary,
  progress: OnboardingProgress,
  modules: readonly OnboardingModule[] = ONBOARDING_MODULES,
): OnboardingModule[] {
  return modules.filter(
    (module) =>
      isOnboardingModuleVisible(module, org) && !isModuleSeen(module, progress),
  )
}
