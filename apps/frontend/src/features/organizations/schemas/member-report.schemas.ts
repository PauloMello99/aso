import { z } from "zod"

// Espelha MAX_REPORT_WINDOW_DAYS do backend (report-period.ts): janela
// inclusiva de datas (from..to), no máximo 366 dias.
export const MAX_REPORT_WINDOW_DAYS = 366

const DAY_MS = 24 * 60 * 60 * 1000
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

// Retorna o instante UTC da data yyyy-MM-dd, ou null se não for uma data real
// (ex.: 2026-02-30). Sem `Date` local para não deslocar fuso.
function utcMs(value: string): number | null {
  const m = DATE_PATTERN.exec(value)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const ms = Date.UTC(year, month - 1, day)
  const d = new Date(ms)
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null
  }
  return ms
}

export const memberReportFormSchema = z
  .object({
    from: z.string().min(1, "Informe a data inicial"),
    to: z.string().min(1, "Informe a data final"),
  })
  .superRefine((v, ctx) => {
    if (!v.from || !v.to) return
    const fromMs = utcMs(v.from)
    const toMs = utcMs(v.to)
    if (fromMs === null) {
      ctx.addIssue({ code: "custom", path: ["from"], message: "Data inválida" })
    }
    if (toMs === null) {
      ctx.addIssue({ code: "custom", path: ["to"], message: "Data inválida" })
    }
    if (fromMs === null || toMs === null) return
    if (fromMs > toMs) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "A data final não pode ser anterior à data inicial",
      })
      return
    }
    const days = Math.round((toMs - fromMs) / DAY_MS) + 1
    if (days > MAX_REPORT_WINDOW_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: `O período máximo é de ${MAX_REPORT_WINDOW_DAYS} dias`,
      })
    }
  })

export type MemberReportFormValues = z.infer<typeof memberReportFormSchema>
