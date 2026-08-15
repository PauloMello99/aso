"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { getAdminTicketDetail } from "../api/admin-support.api"

/**
 * Detalhe do ticket na visão admin (cross-org), diferente de `useTicket`
 * (portal do cliente): inclui notas internas e o shape cru de `AdminTicket`
 * (estado de SLA/atribuição). Ver `GET /admin/support/tickets/:id`.
 */
export function useAdminTicketDetail(ticketId: string | undefined) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.adminSupport.detail(ticketId ?? ""),
    queryFn: () => getAdminTicketDetail(ticketId ?? ""),
    enabled: !!ticketId,
  })

  return {
    ticket: data?.ticket ?? null,
    responses: data?.responses ?? [],
    attachments: data?.attachments ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  }
}
