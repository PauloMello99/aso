import { getSession } from "@/features/auth/lib/session"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

/**
 * Baixa um CSV de um endpoint autenticado (RPT-2). Monta os query params
 * (ignorando vazios) e dispara o download do blob retornado.
 */
export async function downloadCsv(
  path: string,
  filename: string,
  params?: Record<string, string | number | undefined | null>,
): Promise<void> {
  const search = new URLSearchParams()
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") {
        search.set(k, String(v))
      }
    }
  }
  const qs = search.toString() ? `?${search.toString()}` : ""
  const token = getSession()?.accessToken
  const res = await fetch(`${API_URL}${path}${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!res.ok) throw new Error("Falha ao exportar.")
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
