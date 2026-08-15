import type { TicketStatus } from "../schemas/ticket.schema"

export interface TicketsFilter {
  status?: TicketStatus
  categoryId?: string
  page?: number
  pageSize?: number
}

/** Filtros da fila admin (cross-org) — `orgId` não existe em `TicketsFilter`
 * porque o portal do cliente já é escopado por org na própria rota. */
export interface AdminTicketQueueFilter {
  status?: TicketStatus
  categoryId?: string
  orgId?: string
  /** Restringe a tickets órfãos (org_id NULL) — FC-3. */
  orphanOnly?: boolean
  page?: number
  pageSize?: number
}
