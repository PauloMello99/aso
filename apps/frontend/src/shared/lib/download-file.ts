import {
  getSession,
  isSessionExpired,
} from "@/features/auth/lib/session"
import { ApiError, refreshSession } from "@/infrastructure/api/client"
import { filenameFromContentDisposition } from "./content-disposition"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

async function resolveToken(): Promise<string | undefined> {
  const session = getSession()
  if (!session) return undefined
  if (isSessionExpired(session.expiresAt)) {
    return (await refreshSession()) ?? undefined
  }
  return session.accessToken
}

// Baixa um arquivo binário autenticado (PDF etc.) e dispara o download no
// navegador usando o nome do Content-Disposition. `apiRequest` só lida com
// JSON, por isso este helper (mesma autenticação de download-export.ts).
// Falhas HTTP viram `ApiError` com `code` do DomainExceptionFilter; para o
// 400 do ValidationPipe (message em array) as mensagens são unidas.
export async function downloadAuthenticatedFile(
  path: string,
  fallbackFilename: string,
): Promise<void> {
  const token = await resolveToken()
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
  } catch (networkError) {
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
      message?: string | string[]
      code?: string
    }
    const message = Array.isArray(body.message)
      ? body.message.join("; ")
      : (body.message ?? `Request failed with status ${res.status}`)
    throw new ApiError(message, res.status, path, body.code)
  }

  const filename = filenameFromContentDisposition(
    res.headers.get("Content-Disposition"),
    fallbackFilename,
  )
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
