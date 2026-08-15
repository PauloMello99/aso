import { z } from "zod"

/**
 * Espelha `CreatePublicTicketDto` do backend
 * (`apps/backend/src/modules/support/interface/dto/create-public-ticket.dto.ts`).
 */
export const createPublicTicketSchema = z.object({
  requesterName: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(120, "Máximo 120 caracteres"),
  requesterEmail: z.string().email("E-mail inválido"),
  subject: z
    .string()
    .min(5, "Mínimo 5 caracteres")
    .max(200, "Máximo 200 caracteres"),
  description: z
    .string()
    .min(10, "Mínimo 10 caracteres")
    .max(5000, "Máximo 5000 caracteres"),
  categorySystemKey: z.string().min(1, "Categoria é obrigatória"),
  turnstileToken: z.string().min(1, "Verificação obrigatória"),
})

export type CreatePublicTicketFormValues = z.infer<
  typeof createPublicTicketSchema
>

export const publicTicketResponseSchema = z.object({
  ticketId: z.string(),
})

export type CreatePublicTicketResponse = z.infer<
  typeof publicTicketResponseSchema
>
