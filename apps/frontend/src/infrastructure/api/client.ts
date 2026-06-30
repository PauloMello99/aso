import {
  clearSession,
  getSession,
  isSessionExpired,
  saveSession,
} from "@/features/auth/lib/session"
import type { StoredSession } from "@/features/auth/types"
import { captureError } from "@/infrastructure/telemetry/telemetry"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

interface ApiOptions extends RequestInit {
  skipAuth?: boolean
}

/**
 * Erro tipado de uma chamada à API. Carrega `status`/`code`/`path` para que as
 * camadas acima (React Query, error tracking) distingam falha de servidor (5xx,
 * reportável) de erro de negócio esperado (4xx). `status === 0` = falha de rede.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
    readonly code?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/** Primeiro segmento do path como módulo/feature (ex.: /materials/… → materials). */
function moduleFromPath(path: string): string {
  return path.split("?")[0]?.split("/").filter(Boolean)[0] ?? "root"
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
  const method = (fetchOptions.method ?? "GET").toUpperCase()
  // Para FormData, deixe o browser definir o Content-Type (com boundary).
  const isFormData =
    typeof FormData !== "undefined" && fetchOptions.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
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

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers })
  } catch (networkError) {
    // Falha de rede / CORS / servidor inacessível — sempre reportável.
    captureError(networkError, {
      source: "api",
      module: moduleFromPath(path),
      path,
      method,
      status: 0,
    })
    throw new ApiError(
      networkError instanceof Error
        ? networkError.message
        : "Network request failed",
      0,
      path,
    )
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string
      code?: string
    }
    const message =
      body.message ?? `Request failed with status ${res.status}`
    const apiError = new ApiError(message, res.status, path, body.code)

    // Apenas falhas de servidor (5xx) vão ao error tracking; 4xx são erros de
    // negócio esperados, tratados pela UI.
    if (res.status >= 500) {
      captureError(apiError, {
        source: "api",
        module: moduleFromPath(path),
        path,
        method,
        status: res.status,
        code: body.code,
      })
    }

    throw apiError
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
