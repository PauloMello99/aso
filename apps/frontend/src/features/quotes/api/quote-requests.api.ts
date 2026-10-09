import { apiRequest } from "@/infrastructure/api/client"
import type {
  DeclineQuoteRequestResult,
  QuoteRequestDetail,
  QuoteRequestsPage,
  ScheduleQuoteRequestBody,
  ScheduleQuoteRequestResult,
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

export function scheduleQuoteRequest(
  orgId: string,
  id: string,
  body: ScheduleQuoteRequestBody,
): Promise<ScheduleQuoteRequestResult> {
  return apiRequest<ScheduleQuoteRequestResult>(
    `/orgs/${orgId}/quotes/${id}/schedule`,
    { method: "POST", body: JSON.stringify(body) },
  )
}

export function declineQuoteRequest(
  orgId: string,
  id: string,
): Promise<DeclineQuoteRequestResult> {
  return apiRequest<DeclineQuoteRequestResult>(
    `/orgs/${orgId}/quotes/${id}/decline`,
    { method: "POST" },
  )
}

export function markQuoteRequestViewed(
  orgId: string,
  id: string,
): Promise<void> {
  return apiRequest<void>(`/orgs/${orgId}/quotes/${id}/viewed`, {
    method: "POST",
  })
}
