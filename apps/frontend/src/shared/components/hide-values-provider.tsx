"use client"

import * as React from "react"
import { useCurrentOrg } from "@/features/dashboard"
import { hideValuesStorageKey } from "@/shared/lib/hide-values"

interface HideValuesContextValue {
  hidden: boolean
  toggle: () => void
}

const HideValuesContext = React.createContext<HideValuesContextValue | null>(
  null,
)

/**
 * Mounted once per org (alongside OrgProvider in OrgLayout) so Caixa e
 * Overview compartilham o mesmo estado de "ocultar valores" — evita dois
 * toggles divergentes e evita re-ler o localStorage a cada navegação entre
 * as duas telas.
 */
export function HideValuesProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { orgId } = useCurrentOrg()
  // Default visível em ambos os renders (servidor e cliente) para não gerar
  // hydration mismatch no Next — o valor real do localStorage só existe no
  // cliente, então é aplicado depois do mount via efeito.
  const [hidden, setHidden] = React.useState(false)

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(hideValuesStorageKey(orgId))
      setHidden(stored === "1")
    } catch {
      // localStorage indisponível (ex.: modo privado) — mantém default visível
    }
  }, [orgId])

  const toggle = React.useCallback(() => {
    setHidden((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(
          hideValuesStorageKey(orgId),
          next ? "1" : "0",
        )
      } catch {
        // localStorage indisponível — estado em memória segue válido na sessão
      }
      return next
    })
  }, [orgId])

  const value = React.useMemo(() => ({ hidden, toggle }), [hidden, toggle])

  return (
    <HideValuesContext.Provider value={value}>
      {children}
    </HideValuesContext.Provider>
  )
}

export function useHideValues(): HideValuesContextValue {
  const ctx = React.useContext(HideValuesContext)
  if (!ctx) {
    throw new Error(
      "useHideValues must be used within a HideValuesProvider (OrgLayout)",
    )
  }
  return ctx
}
