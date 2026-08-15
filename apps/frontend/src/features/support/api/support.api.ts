import { apiRequest } from "@/infrastructure/api/client"
import type {
  Ticket,
  TicketAttachment,
  TicketCategory,
  TicketDetail,
  TicketListResponse,
  TicketResponse,
} from "../schemas/ticket.schema"
import type { TicketsFilter } from "../types"

export function listCategories(orgId: string): Promise<TicketCategory[]> {
  return apiRequest<TicketCategory[]>(`/orgs/${orgId}/support/categories`)
}

export function listTickets(
  orgId: string,
  filter?: TicketsFilter,
): Promise<TicketListResponse> {
  const params = new URLSearchParams()
  if (filter?.status) params.set("status", filter.status)
  if (filter?.categoryId) params.set("categoryId", filter.categoryId)
  if (filter?.page) params.set("page", String(filter.page))
  if (filter?.pageSize) params.set("pageSize", String(filter.pageSize))
  const query = params.toString() ? `?${params.toString()}` : ""
  return apiRequest<TicketListResponse>(`/orgs/${orgId}/support/tickets${query}`)
}

export function getTicketDetail(
  orgId: string,
  ticketId: string,
): Promise<TicketDetail> {
  return apiRequest<TicketDetail>(`/orgs/${orgId}/support/tickets/${ticketId}`)
}

export function createTicket(
  orgId: string,
  body: { categorySystemKey: string; subject: string; description: string },
): Promise<Ticket> {
  return apiRequest<Ticket>(`/orgs/${orgId}/support/tickets`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function addResponse(
  orgId: string,
  ticketId: string,
  body: { body: string },
): Promise<TicketResponse> {
  return apiRequest<TicketResponse>(
    `/orgs/${orgId}/support/tickets/${ticketId}/responses`,
    { method: "POST", body: JSON.stringify(body) },
  )
}

export function reopenTicket(orgId: string, ticketId: string): Promise<Ticket> {
  return apiRequest<Ticket>(`/orgs/${orgId}/support/tickets/${ticketId}/reopen`, {
    method: "POST",
  })
}

export function uploadAttachment(
  orgId: string,
  ticketId: string,
  file: File,
): Promise<TicketAttachment> {
  const formData = new FormData()
  formData.set("file", file)
  return apiRequest<TicketAttachment>(
    `/orgs/${orgId}/support/tickets/${ticketId}/attachments`,
    { method: "POST", body: formData },
  )
}

export function getAttachmentUrl(
  orgId: string,
  attachmentId: string,
): Promise<{ url: string }> {
  return apiRequest<{ url: string }>(
    `/orgs/${orgId}/support/attachments/${attachmentId}/url`,
  )
}
