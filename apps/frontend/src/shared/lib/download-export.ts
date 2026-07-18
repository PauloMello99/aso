import { getSession } from "@/features/auth/lib/session"
import type { ExportFormat } from "@/shared/components/ui/export-menu"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

export async function downloadExport(
  path: string,
  filenameBase: string,
  format: ExportFormat,
  params?: Record<string, string | number | undefined | null>,
): Promise<void> {
  const search = new URLSearchParams()
  const allParams: Record<string, string | number | undefined | null> = {
    ...params,
    format,
  }
  for (const [k, v] of Object.entries(allParams)) {
    if (v !== undefined && v !== null && v !== "") {
      search.set(k, String(v))
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
  a.download = `${filenameBase}.${format}`
  a.click()
  URL.revokeObjectURL(url)
}
