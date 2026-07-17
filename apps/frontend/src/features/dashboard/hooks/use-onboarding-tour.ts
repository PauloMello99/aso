"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/router"
import { driver, type DriveStep } from "driver.js"
import { useMe } from "@/features/auth/hooks/use-me"
import { getTourSteps } from "@/features/dashboard/lib/onboarding-tour"
import type { OrgSummary } from "@/features/dashboard/hooks/use-orgs"
import type { Me } from "@/features/auth/types"

/** Breakpoint `md` do Tailwind — mesmo ponto de corte do drawer em `org-sidebar.tsx`. */
const MOBILE_QUERY = "(max-width: 767px)"
/** Combina com a duração da transição do drawer (`duration-200`) em `org-sidebar.tsx`, com folga. */
const DRAWER_SETTLE_MS = 250

interface UseOnboardingTourParams {
  me: Me | null
  org: OrgSummary | undefined
  setMobileOpen: (open: boolean) => void
}

/** Passos de navegação apontam para dentro da sidebar — únicos que exigem o drawer aberto no mobile. */
function isSidebarStep(step: DriveStep): boolean {
  return typeof step.element === "string" && step.element.startsWith('[data-tour="nav-')
}

/**
 * Dispara o tour de onboarding automaticamente (primeiro acesso, antes de
 * `onboardingCompletedAt` ser setada) ou em modo replay (`?tour=1`, disparado pelo botão
 * "Ver tour novamente" em Minha Conta). O driver.js só é instanciado dentro de efeitos
 * (nunca em render, por segurança SSR) e o tour nunca navega — apenas alterna o drawer
 * mobile e o destaque entre elementos já montados no `OrgLayout` atual.
 */
export function useOnboardingTour({ me, org, setMobileOpen }: UseOnboardingTourParams) {
  const router = useRouter()
  const { updateMe } = useMe()

  const startedRef = useRef(false)
  const driverRef = useRef<ReturnType<typeof driver> | null>(null)

  // Refs sempre atualizadas para os callbacks do driver.js — evita reinstanciar o
  // tour a cada render e fechamentos obsoletos sem inflar as deps do efeito abaixo.
  const setMobileOpenRef = useRef(setMobileOpen)
  setMobileOpenRef.current = setMobileOpen
  const updateMeRef = useRef(updateMe)
  updateMeRef.current = updateMe
  const routerRef = useRef(router)
  routerRef.current = router

  const isReplay = router.query.tour === "1"
  const shouldAutoStart = !!me && me.onboardingCompletedAt == null && !!org

  // Destrói o driver SOMENTE no unmount real do OrgLayout — nunca por causa de
  // mudanças em `me`/`org` (ex.: a própria mutation de conclusão do tour, que troca a
  // identidade de `me` e não deve derrubar um tour em andamento).
  useEffect(() => {
    return () => {
      driverRef.current?.destroy()
    }
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    if (!org) return
    if (!shouldAutoStart && !isReplay) return

    // Alias const — preserva o narrowing de `org` (parâmetro, não `const`) dentro do
    // closure do setTimeout abaixo.
    const resolvedOrg = org
    const wasReplay = isReplay
    const shouldMarkComplete = !wasReplay && me?.onboardingCompletedAt == null
    let finished = false

    // O sidebar pode ainda não estar montado no primeiro paint do layout. A flag
    // `startedRef` só é setada AQUI dentro (não antes de agendar o timer): em Strict
    // Mode (dev), o React monta/desmonta o efeito uma vez de propósito — o cleanup
    // cancelaria este setTimeout, e se a flag já estivesse true a 2ª montagem nunca
    // reagendaria, deixando o tour morto. Setando a flag só quando o driver de fato é
    // criado, a 2ª montagem consegue reagendar normalmente.
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
            // Abre o drawer antes do destaque; o driver recalcula a posição a cada
            // frame durante a transição, e o refresh() abaixo corrige o estado final.
            setMobileOpenRef.current(true)
            refreshTimer = window.setTimeout(
              () => tourDriver.refresh(),
              DRAWER_SETTLE_MS,
            )
          } else {
            // Passo fora da sidebar (popover central ou user-menu no header) — fecha o
            // drawer para não deixar o overlay mobile cobrindo o header por cima dele.
            setMobileOpenRef.current(false)
          }
        },
        // onDestroyed cobre TODOS os caminhos de dispensa (completar, X, Esc, overlay) —
        // onDestroyStarted roda antes do teardown real e não deve ser usado aqui.
        onDestroyed: () => {
          // Evita que o refresh() agendado dispare sobre um driver já destruído se o
          // usuário dispensar o tour (Esc/overlay/X) dentro da janela de settle do drawer.
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
