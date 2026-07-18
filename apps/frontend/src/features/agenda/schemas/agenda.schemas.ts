import { z } from "zod"

export const eventFormSchema = z
  .object({
    type: z.enum(["appointment", "unavailability"]),
    title: z.string().min(1, "Título obrigatório").max(200, "Máximo 200 caracteres"),
    customerId: z.string().optional(),
    date: z.string().min(1, "Data obrigatória"),
    startTime: z.string().min(1, "Início obrigatório"),
    endTime: z.string().min(1, "Fim obrigatório"),
    allDay: z.boolean().optional(),
    description: z.string().max(1000, "Máximo 1000 caracteres").optional(),
    assignedTo: z.string().optional(),
    visibility: z.enum(["private", "shared"]),
  })
  .refine((v) => v.allDay || v.startTime < v.endTime, {
    message: "O fim deve ser após o início",
    path: ["endTime"],
  })

export type EventFormValues = z.infer<typeof eventFormSchema>
