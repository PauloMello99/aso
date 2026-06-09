import {
  clearSession,
  getSession,
  isSessionExpired,
  saveSession,
} from "@/features/auth/lib/session"
import type { StoredSession } from "@/features/auth/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

interface ApiOptions extends RequestInit {
  skipAuth?: boolean
}

async function refreshSession(): Promise<string | null> {
  const session = getSession()
  if (!session) return null

  const res = await fetch(`${API_URL}/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  })

  if (!res.ok) {
    clearSession()
    return null
  }

  const data = (await res.json()) as StoredSession
  saveSession(data)
  return data.accessToken
}

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  }

  if (!skipAuth) {
    const session = getSession()
    if (session) {
      if (isSessionExpired(session.expiresAt)) {
        const newToken = await refreshSession()
        if (newToken) headers["Authorization"] = `Bearer ${newToken}`
      } else {
        headers["Authorization"] = `Bearer ${session.accessToken}`
      }
    }
  }

  const res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers })

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ message: "An error occurred" }))
    throw new Error(
      (error as { message?: string }).message ??
        `Request failed with status ${res.status}`,
    )
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
