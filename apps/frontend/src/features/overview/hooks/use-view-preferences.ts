"use client"

import * as React from "react"
import {
  DEFAULT_VIEW_PREFERENCES,
  parseViewPreferences,
  serializeViewPreferences,
  viewPreferencesStorageKey,
  withViewPreference,
  type ViewId,
  type ViewOption,
  type ViewPreferences,
} from "../lib/view-preferences"

export function useViewPreferences(orgId: string) {
  // Default nos dois renders (SSR e cliente) para evitar hydration mismatch;
  // o valor salvo é aplicado depois do mount.
  const [prefs, setPrefs] = React.useState<ViewPreferences>(
    DEFAULT_VIEW_PREFERENCES,
  )

  React.useEffect(() => {
    try {
      setPrefs(
        parseViewPreferences(
          window.localStorage.getItem(viewPreferencesStorageKey(orgId)),
        ),
      )
    } catch {
      // localStorage indisponível — mantém defaults
    }
  }, [orgId])

  const setPreference = React.useCallback(
    <K extends ViewId>(id: K, value: ViewOption<K>) => {
      setPrefs((prev) => {
        const next = withViewPreference(prev, id, value)
        try {
          window.localStorage.setItem(
            viewPreferencesStorageKey(orgId),
            serializeViewPreferences(next),
          )
        } catch {
          // localStorage indisponível — preferência vale só na sessão
        }
        return next
      })
    },
    [orgId],
  )

  return { prefs, setPreference }
}
