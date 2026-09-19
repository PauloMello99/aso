"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { campaignDeliveryReportErrorMessage } from "../lib/error-messages"
import type {
  CampaignDeliveryReportResponse,
  CampaignDeliveryReportRow,
  CampaignDeliveryReportSummary,
} from "../schemas/campaign-delivery-report.schema"

const EMPTY_ITEMS: CampaignDeliveryReportRow[] = []
const EMPTY_SUMMARY: CampaignDeliveryReportSummary = {
  sent: 0,
  failed: 0,
  bounced: 0,
}

/**
 * Relatório de entrega de campanhas (owner-only no backend). Mesmo padrão de
 * `useCampaigns`: `apiRequest<T>` tipado pelo `z.infer` do schema, sem parse
 * em runtime; o 403 do `OrgOwnerGuard` chega como `ApiError` em `error`.
 */
export function useCampaignDeliveryReport(orgId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.campaigns.deliveries(orgId),
    queryFn: () =>
      apiRequest<CampaignDeliveryReportResponse>(
        `/orgs/${orgId}/campaigns/deliveries`,
      ),
    enabled: !!orgId,
  })

  return {
    summary: data?.summary ?? EMPTY_SUMMARY,
    items: data?.items ?? EMPTY_ITEMS,
    loading: isLoading,
    error: error ? campaignDeliveryReportErrorMessage(error) : null,
  }
}
