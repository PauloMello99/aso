import {
  ONBOARDING_MODULES,
  TOUR_CLOSING_STEP,
  TOUR_NEWS_STEP,
  TOUR_WELCOME_STEP,
  getPendingOnboardingModules,
  isOnboardingModuleVisible,
  type OnboardingProgress,
  type TourStep,
} from "./onboarding-modules"
import type { OrgSummary } from "../hooks/use-orgs"

export type { TourStep }

/** Tour completo (replay manual, `?tour=1`). */
export function getTourSteps(org: OrgSummary): TourStep[] {
  const navSteps = ONBOARDING_MODULES.filter((module) =>
    isOnboardingModuleVisible(module, org),
  ).flatMap((module) => module.steps)

  return [TOUR_WELCOME_STEP, ...navSteps, TOUR_CLOSING_STEP]
}

/** Tour incremental: apenas modulos pendentes. Vazio quando nao ha nada novo. */
export function getPendingTourSteps(
  org: OrgSummary,
  progress: OnboardingProgress,
): TourStep[] {
  const pending = getPendingOnboardingModules(org, progress)
  if (pending.length === 0) return []

  const opening =
    progress.onboardingCompletedAt != null ? TOUR_NEWS_STEP : TOUR_WELCOME_STEP

  return [
    opening,
    ...pending.flatMap((module) => module.steps),
    TOUR_CLOSING_STEP,
  ]
}
