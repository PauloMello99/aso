"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { assignTicket, listAdminTicketQueue } from "../api/admin-support.api"
import type { AdminTicket } from "../schemas/ticket.schema"
import type { AdminTicketQueueFilter } from "../types"

export function useAdminTicketQueue(filters?: AdminTicketQueueFilter) {
  const queryClient = useQueryClient()

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.adminSupport.queue(filters),
    queryFn: () => listAdminTicketQueue(filters),
  })

  const assignMutation = useMutation({
    mutationFn: (ticketId: string) => assignTicket(ticketId),
    onSuccess: () => {
      // Invalida o namespace inteiro (não só `.queue(filters)`) pelo mesmo
      // motivo documentado em `use-tickets.ts`: a key de queue inclui o
      // objeto de filtros no path, então listas cacheadas com filtros
      // diferentes não seriam pegas por um invalidate escopado a `filters`.
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminSupport.all })
    },
  })

  async function assignToMe(ticketId: string): Promise<AdminTicket> {
    return assignMutation.mutateAsync(ticketId)
  }

  return {
    tickets: data?.items ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    assignToMe,
    assigning: assignMutation.isPending,
  }
}
