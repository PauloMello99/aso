import {
  ONBOARDING_MODULES,
  TOUR_CLOSING_STEP,
  TOUR_NEWS_STEP,
  TOUR_WELCOME_STEP,
  NO_UNAVAILABLE_MODULES,
  getPendingOnboardingModules,
  isOnboardingModuleVisible,
  type OnboardingProgress,
  type TourStep,
  type UnavailableModuleIds,
} from "./onboarding-modules"
import type { OrgSummary } from "../hooks/use-orgs"

export type { TourStep }

/** Tour completo (replay manual, `?tour=1`). */
export function getTourSteps(
  org: OrgSummary,
  unavailable: UnavailableModuleIds = NO_UNAVAILABLE_MODULES,
): TourStep[] {
  const navSteps = ONBOARDING_MODULES.filter((module) =>
    isOnboardingModuleVisible(module, org, unavailable),
  ).flatMap((module) => module.steps)

  return [TOUR_WELCOME_STEP, ...navSteps, TOUR_CLOSING_STEP]
}

/** Tour incremental: apenas modulos pendentes. Vazio quando nao ha nada novo. */
export function getPendingTourSteps(
  org: OrgSummary,
  progress: OnboardingProgress,
  unavailable: UnavailableModuleIds = NO_UNAVAILABLE_MODULES,
): TourStep[] {
  const pending = getPendingOnboardingModules(
    org,
    progress,
    ONBOARDING_MODULES,
    unavailable,
  )
  if (pending.length === 0) return []

  const opening =
    progress.onboardingCompletedAt != null ? TOUR_NEWS_STEP : TOUR_WELCOME_STEP

  return [
    opening,
    ...pending.flatMap((module) => module.steps),
    TOUR_CLOSING_STEP,
  ]
}
