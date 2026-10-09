import { z } from "zod"
import { isScheduleDuration } from "../lib/schedule-quote"

export const scheduleQuoteSchema = z.object({
  date: z
    .string()
    .min(1, "Informe a data")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data"),
  startTime: z
    .string()
    .min(1, "Informe o horário")
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe o horário"),
  durationMinutes: z
    .number()
    .refine(isScheduleDuration, "Escolha uma duração válida"),
})

export type ScheduleQuoteValues = z.infer<typeof scheduleQuoteSchema>
