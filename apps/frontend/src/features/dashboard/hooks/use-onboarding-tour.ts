"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/router"
import { driver, type DriveStep } from "driver.js"
import { useMe } from "@/features/auth/hooks/use-me"
import { getTourSteps } from "@/features/dashboard/lib/onboarding-tour"
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
  const driverRef = useRef<ReturnType<typeof driver> | null>(null)

  const setMobileOpenRef = useRef(setMobileOpen)
  setMobileOpenRef.current = setMobileOpen
  const updateMeRef = useRef(updateMe)
  updateMeRef.current = updateMe
  const routerRef = useRef(router)
  routerRef.current = router

  const isReplay = router.query.tour === "1"
  const shouldAutoStart = !!me && me.onboardingCompletedAt == null && !!org

  useEffect(() => {
    return () => {
      driverRef.current?.destroy()
    }
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    if (!org) return
    if (!shouldAutoStart && !isReplay) return

    const resolvedOrg = org
    const wasReplay = isReplay
    const shouldMarkComplete = !wasReplay && me?.onboardingCompletedAt == null
    let finished = false

    const timer = window.setTimeout(() => {
      if (startedRef.current) return
      startedRef.current = true

      const isMobile = window.matchMedia(MOBILE_QUERY).matches

      const steps: DriveStep[] = getTourSteps(resolvedOrg).map((step) => ({
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
            if (shouldMarkComplete) {
              void updateMeRef.current({
                onboardingCompletedAt: new Date().toISOString(),
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
