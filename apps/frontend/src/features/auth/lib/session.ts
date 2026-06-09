import type { StoredSession } from "../types"

const SESSION_KEY = "inkops_session"

export function saveSession(session: StoredSession): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function getSession(): StoredSession | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem(SESSION_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as StoredSession
  } catch {
    return null
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(SESSION_KEY)
}

export function isSessionExpired(expiresAt: number): boolean {
  return Date.now() / 1000 >= expiresAt - 60
}
