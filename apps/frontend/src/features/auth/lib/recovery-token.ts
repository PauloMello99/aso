import { ReadonlyURLSearchParams } from "next/navigation"

export interface RecoveryTokens {
  accessToken: string
  refreshToken: string
  type: string
}

export function parseRecoveryTokens(params: ReadonlyURLSearchParams): RecoveryTokens | null {
  const accessToken = params.get("access_token")
  const refreshToken = params.get("refresh_token")
  const type = params.get("type")

  if (!accessToken || type !== "recovery") return null

  return {
    accessToken,
    refreshToken: refreshToken ?? "",
    type,
  }
}

export function clearRecoveryHash(): void {
  if (typeof window === "undefined") return
  window.history.replaceState(null, "", window.location.pathname + window.location.search)
}
