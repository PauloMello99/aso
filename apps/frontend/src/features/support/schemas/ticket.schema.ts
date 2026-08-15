import { z } from "zod"

export const createTicketSchema = z.object({
  categorySystemKey: z.string().min(1, "Categoria é obrigatória"),
  subject: z
    .string()
    .min(5, "Mínimo 5 caracteres")
    .max(200, "Máximo 200 caracteres"),
  description: z
    .string()
    .min(10, "Mínimo 10 caracteres")
    .max(5000, "Máximo 5000 caracteres"),
})

export type CreateTicketFormValues = z.infer<typeof createTicketSchema>

export const addResponseSchema = z.object({
  body: z
    .string()
    .min(1, "Mensagem é obrigatória")
    .max(5000, "Máximo 5000 caracteres"),
})

export type AddResponseFormValues = z.infer<typeof addResponseSchema>

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed"

export type TicketPriority = "low" | "normal" | "high" | "urgent"

export interface Ticket {
  id: string
  orgId: string | null
  categoryId: string
  requesterName: string
  requesterEmail: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  firstResponseAt: string | null
  resolvedAt: string | null
  closedAt: string | null
  reopenedAt: string | null
  createdAt: string
  updatedAt: string
}

export type TicketResponseAuthorType = "customer" | "agent" | "system"

export interface TicketResponse {
  id: string
  ticketId: string
  authorType: TicketResponseAuthorType
  authorUserId: string | null
  body: string
  createdAt: string
}

export interface TicketDetail {
  ticket: Ticket
  responses: TicketResponse[]
  attachments: TicketAttachment[]
}

export interface TicketCategory {
  id: string
  systemKey: string
  label: string
  slaFirstResponseMinutes: number
  slaResolutionMinutes: number
  enabled: boolean
  createdAt: string
}

export interface TicketListResponse {
  items: Ticket[]
  total: number
}

export interface TicketAttachment {
  id: string
  ticketId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

/**
 * Shape cru de `TicketEntity` retornado pela fila admin (cross-org) — ao
 * contrário de `Ticket` (view do portal do cliente), inclui estado interno
 * de operação/SLA. Ver `admin-support.controller.ts` e `ticket.entity.ts`
 * no backend.
 */
export interface AdminTicket {
  id: string
  orgId: string | null
  categoryId: string
  createdBy: string | null
  requesterName: string
  requesterEmail: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  assignedAgentId: string | null
  firstResponseAt: string | null
  resolvedAt: string | null
  closedAt: string | null
  reopenedAt: string | null
  slaFirstResponseDueAt: string
  slaResolutionDueAt: string
  slaFirstResponseBreachedAt: string | null
  slaResolutionBreachedAt: string | null
  slaWarningNotifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminTicketQueueResponse {
  items: AdminTicket[]
  total: number
}

/**
 * Resposta na visão admin — diferente de `TicketResponse` (portal), inclui
 * `isInternalNote` para a fila distinguir nota interna de resposta visível
 * ao cliente. Ver `AdminTicketResponseView` em `admin-support.controller.ts`.
 */
export interface AdminTicketResponse extends TicketResponse {
  isInternalNote: boolean
}

export interface AdminTicketDetail {
  ticket: AdminTicket
  responses: AdminTicketResponse[]
  attachments: TicketAttachment[]
}

/** Subconjunto de status para o qual a fila admin pode transicionar um
 * ticket via PATCH — espelha `CHANGEABLE_TICKET_STATUSES` no backend
 * (`change-ticket-status.dto.ts`). "open" não é destino válido (só se
 * chega lá via reabertura do cliente). */
export type ChangeableTicketStatus = Exclude<TicketStatus, "open">

export const CHANGEABLE_TICKET_STATUSES: ChangeableTicketStatus[] = [
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
]

export const addAgentResponseSchema = z.object({
  body: z
    .string()
    .min(1, "Mensagem é obrigatória")
    .max(5000, "Máximo 5000 caracteres"),
  isInternalNote: z.boolean(),
})

export type AddAgentResponseFormValues = z.infer<typeof addAgentResponseSchema>
