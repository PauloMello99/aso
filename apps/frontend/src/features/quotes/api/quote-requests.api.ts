import { apiRequest } from "@/infrastructure/api/client"
import type {
  QuoteRequestDetail,
  QuoteRequestsPage,
  UnreadQuoteCount,
} from "../types"

export const QUOTE_REQUESTS_PAGE_SIZE = 20

export function listQuoteRequests(
  orgId: string,
  page: number,
): Promise<QuoteRequestsPage> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(QUOTE_REQUESTS_PAGE_SIZE),
  })
  return apiRequest<QuoteRequestsPage>(`/orgs/${orgId}/quotes?${params}`)
}

export function getQuoteRequest(
  orgId: string,
  id: string,
): Promise<QuoteRequestDetail> {
  return apiRequest<QuoteRequestDetail>(`/orgs/${orgId}/quotes/${id}`)
}

export function getUnreadQuoteCount(orgId: string): Promise<UnreadQuoteCount> {
  return apiRequest<UnreadQuoteCount>(`/orgs/${orgId}/quotes/unread-count`)
}

export function markQuoteRequestViewed(
  orgId: string,
  id: string,
): Promise<void> {
  return apiRequest<void>(`/orgs/${orgId}/quotes/${id}/viewed`, {
    method: "POST",
  })
}
