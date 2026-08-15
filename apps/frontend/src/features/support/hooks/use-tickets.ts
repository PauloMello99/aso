"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { createTicket, listTickets } from "../api/support.api"
import type { Ticket } from "../schemas/ticket.schema"
import type { TicketsFilter } from "../types"

export function useTickets(orgId: string, filter?: TicketsFilter) {
  const queryClient = useQueryClient()

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.support.list(orgId, filter),
    queryFn: () => listTickets(orgId, filter),
    enabled: !!orgId,
  })

  type CreateBody = {
    categorySystemKey: string
    subject: string
    description: string
  }

  const createTicketMutation = useMutation({
    mutationFn: (body: CreateBody) => createTicket(orgId, body),
    onSuccess: () => {
      // invalida o namespace inteiro (não só "list") porque a key de list
      // inclui o objeto de filtros no path — invalidar só `.list(orgId)`
      // sem os mesmos filtros não bate por prefixo com listas já cacheadas
      // com filtro diferente.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.support.all(orgId),
      })
    },
  })

  async function createNewTicket(body: CreateBody): Promise<Ticket> {
    return createTicketMutation.mutateAsync(body)
  }

  return {
    tickets: data?.items ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    createTicket: createNewTicket,
    creating: createTicketMutation.isPending,
  }
}
