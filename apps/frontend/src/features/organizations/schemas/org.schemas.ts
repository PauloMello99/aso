import { z } from "zod"

export const createOrgSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
})

export type CreateOrgFormValues = z.infer<typeof createOrgSchema>

export const updateOrgSchema = createOrgSchema.partial()

export type UpdateOrgFormValues = z.infer<typeof updateOrgSchema>

export const inviteSchema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(["owner", "employee"] as const),
})

export type InviteFormValues = z.infer<typeof inviteSchema>
