import { apiRequest } from "@/infrastructure/api/client"
import type {
  AdminTicket,
  AdminTicketDetail,
  AdminTicketQueueResponse,
  ChangeableTicketStatus,
  TicketResponse,
} from "../schemas/ticket.schema"
import type { AdminTicketQueueFilter } from "../types"

export function getAdminTicketDetail(
  ticketId: string,
): Promise<AdminTicketDetail> {
  return apiRequest<AdminTicketDetail>(`/admin/support/tickets/${ticketId}`)
}

export function listAdminTicketQueue(
  filters?: AdminTicketQueueFilter,
): Promise<AdminTicketQueueResponse> {
  const params = new URLSearchParams()
  if (filters?.status) params.set("status", filters.status)
  if (filters?.categoryId) params.set("categoryId", filters.categoryId)
  if (filters?.orgId) params.set("orgId", filters.orgId)
  if (filters?.orphanOnly) params.set("orphanOnly", "true")
  if (filters?.page) params.set("page", String(filters.page))
  if (filters?.pageSize) params.set("pageSize", String(filters.pageSize))
  const query = params.toString() ? `?${params.toString()}` : ""
  return apiRequest<AdminTicketQueueResponse>(
    `/admin/support/tickets${query}`,
  )
}

export function assignTicket(
  ticketId: string,
  agentUserId?: string,
): Promise<AdminTicket> {
  // Corpo sempre enviado como objeto (mesmo vazio): `agentUserId` é
  // opcional no DTO, mas um POST sem body colide com o ValidationPipe
  // global do Nest ao tentar parsear JSON vazio.
  return apiRequest<AdminTicket>(`/admin/support/tickets/${ticketId}/assign`, {
    method: "POST",
    body: JSON.stringify(agentUserId ? { agentUserId } : {}),
  })
}

export function addAgentResponse(
  ticketId: string,
  body: string,
  isInternalNote: boolean,
): Promise<TicketResponse> {
  return apiRequest<TicketResponse>(
    `/admin/support/tickets/${ticketId}/responses`,
    { method: "POST", body: JSON.stringify({ body, isInternalNote }) },
  )
}

export function changeTicketStatus(
  ticketId: string,
  targetStatus: ChangeableTicketStatus,
): Promise<AdminTicket> {
  return apiRequest<AdminTicket>(`/admin/support/tickets/${ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ targetStatus }),
  })
}

export function linkTicketOrganization(
  ticketId: string,
  orgId: string,
): Promise<AdminTicket> {
  return apiRequest<AdminTicket>(
    `/admin/support/tickets/${ticketId}/link-organization`,
    { method: "POST", body: JSON.stringify({ orgId }) },
  )
}

/**
 * URL assinada de anexo na visão admin (cross-org) — usada em tickets órfãos
 * (`orgId: null`), onde a rota do portal (`getAttachmentUrl` em
 * `support.api.ts`, escopada por org) não se aplica.
 */
export function getAdminTicketAttachmentUrl(
  attachmentId: string,
): Promise<{ url: string }> {
  return apiRequest<{ url: string }>(
    `/admin/support/attachments/${attachmentId}/url`,
  )
}
