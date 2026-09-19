"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/router"
import { driver, type DriveStep } from "driver.js"
import { useMe } from "@/features/auth/hooks/use-me"
import { getPendingOnboardingModules } from "@/features/dashboard/lib/onboarding-modules"
import { getPendingTourSteps, getTourSteps } from "@/features/dashboard/lib/onboarding-tour"
import type { OrgSummary } from "@/features/dashboard/hooks/use-orgs"
import type { Me } from "@/features/auth/types"

const MOBILE_QUERY = "(max-width: 767px)"
const DRAWER_SETTLE_MS = 250

interface UseOnboardingTourParams {
  me: Me | null
  org: OrgSummary | undefined
  setMobileOpen: (open: boolean) => void
}

function isSidebarStep(step: DriveStep): boolean {
  return typeof step.element === "string" && step.element.startsWith('[data-tour="nav-')
}

export function useOnboardingTour({ me, org, setMobileOpen }: UseOnboardingTourParams) {
  const router = useRouter()
  const { updateMe } = useMe()

  const startedRef = useRef(false)
  const lastOrgIdRef = useRef<string | null>(null)
  const discardRef = useRef(false)
  const driverRef = useRef<ReturnType<typeof driver> | null>(null)

  const setMobileOpenRef = useRef(setMobileOpen)
  setMobileOpenRef.current = setMobileOpen
  const updateMeRef = useRef(updateMe)
  updateMeRef.current = updateMe
  const routerRef = useRef(router)
  routerRef.current = router

  const isReplay = router.query.tour === "1"
  const shouldAutoStart =
    !!me && !!org && getPendingOnboardingModules(org, me).length > 0

  useEffect(() => {
    return () => {
      driverRef.current?.destroy()
    }
  }, [])

  useEffect(() => {
    if (org && lastOrgIdRef.current !== org.id) {
      if (lastOrgIdRef.current !== null) {
        // troca de organizacao com o hook montado: descarta tour em andamento
        // (sem persistir progresso) e libera o auto-start para a nova org
        if (driverRef.current?.isActive()) {
          discardRef.current = true
          driverRef.current.destroy()
          discardRef.current = false
        }
        driverRef.current = null
        startedRef.current = false
      }
      lastOrgIdRef.current = org.id
    }
    if (startedRef.current) return
    if (!org) return
    if (!shouldAutoStart && !isReplay) return

    const resolvedOrg = org
    const wasReplay = isReplay
    const shouldMarkComplete = !wasReplay && me?.onboardingCompletedAt == null
    const offeredModules = wasReplay
      ? []
      : getPendingOnboardingModules(resolvedOrg, me ?? {})
    let finished = false

    const timer = window.setTimeout(() => {
      if (startedRef.current) return
      startedRef.current = true

      const isMobile = window.matchMedia(MOBILE_QUERY).matches

      const tourSteps = wasReplay
        ? getTourSteps(resolvedOrg)
        : getPendingTourSteps(resolvedOrg, me ?? {})
      if (tourSteps.length === 0) {
        startedRef.current = false
        return
      }

      const steps: DriveStep[] = tourSteps.map((step) => ({
        element: step.selector ?? undefined,
        popover: { title: step.title, description: step.description },
      }))

      let refreshTimer: number | undefined

      const tourDriver = driver({
        showProgress: true,
        allowClose: true,
        nextBtnText: "Próximo",
        prevBtnText: "Anterior",
        doneBtnText: "Concluir",
        onHighlightStarted: (_element, step) => {
          if (!isMobile) return
          if (isSidebarStep(step)) {
            setMobileOpenRef.current(true)
            refreshTimer = window.setTimeout(
              () => tourDriver.refresh(),
              DRAWER_SETTLE_MS,
            )
          } else {
            setMobileOpenRef.current(false)
          }
        },
        onDestroyed: () => {
          window.clearTimeout(refreshTimer)
          if (isMobile) setMobileOpenRef.current(false)
          if (!finished) {
            finished = true
            if (!discardRef.current && !wasReplay && offeredModules.length > 0) {
              const onboardingSeen = Object.fromEntries(
                offeredModules.map((module) => [module.id, module.version]),
              )
              updateMeRef
                .current({
                  onboardingSeen,
                  ...(shouldMarkComplete
                    ? { onboardingCompletedAt: new Date().toISOString() }
                    : {}),
                })
                .catch(() => {
                  // falha intencionalmente silenciosa: o tour reaparece no proximo load
                })
            }
          }
          if (wasReplay) {
            const nextQuery = { ...routerRef.current.query }
            delete nextQuery.tour
            void routerRef.current.replace(
              { pathname: routerRef.current.pathname, query: nextQuery },
              undefined,
              { shallow: true },
            )
          }
        },
        steps,
      })

      driverRef.current = tourDriver
      tourDriver.drive()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [org, shouldAutoStart, isReplay, me])
}
