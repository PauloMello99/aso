"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/infrastructure/query/query-keys"
import {
  addAgentResponse,
  changeTicketStatus,
  linkTicketOrganization,
} from "../api/admin-support.api"
import type {
  AdminTicket,
  ChangeableTicketStatus,
  TicketResponse,
} from "../schemas/ticket.schema"

/**
 * Mutations do painel de detalhe do ticket no admin — batem em rotas admin
 * (cross-org). Invalida a fila e o detalhe admin (`useAdminTicketDetail`),
 * que é quem exibe notas internas.
 */
export function useAdminTicketActions(ticketId: string | undefined) {
  const queryClient = useQueryClient()

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminSupport.all })
    if (ticketId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminSupport.detail(ticketId),
      })
    }
  }

  const respondMutation = useMutation({
    mutationFn: ({
      body,
      isInternalNote,
    }: {
      body: string
      isInternalNote: boolean
    }) => addAgentResponse(ticketId ?? "", body, isInternalNote),
    onSuccess: invalidate,
  })

  const statusMutation = useMutation({
    mutationFn: (targetStatus: ChangeableTicketStatus) =>
      changeTicketStatus(ticketId ?? "", targetStatus),
    onSuccess: invalidate,
  })

  const linkOrganizationMutation = useMutation({
    mutationFn: ({
      ticketId: mutationTicketId,
      orgId,
    }: {
      ticketId: string
      orgId: string
    }) => linkTicketOrganization(mutationTicketId, orgId),
    // Invalida pelas `variables` (não pelo `ticketId` do hook, que pode ser
    // `undefined` quando chamado a partir de uma linha da fila) — garante
    // que o detalhe do ticket vinculado seja refeito mesmo fora da página
    // de detalhe.
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminSupport.all })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminSupport.detail(variables.ticketId),
      })
    },
  })

  async function respond(
    body: string,
    isInternalNote: boolean,
  ): Promise<TicketResponse> {
    return respondMutation.mutateAsync({ body, isInternalNote })
  }

  async function changeStatus(targetStatus: ChangeableTicketStatus) {
    return statusMutation.mutateAsync(targetStatus)
  }

  async function linkOrganization(
    targetTicketId: string,
    orgId: string,
  ): Promise<AdminTicket> {
    return linkOrganizationMutation.mutateAsync({
      ticketId: targetTicketId,
      orgId,
    })
  }

  return {
    respond,
    responding: respondMutation.isPending,
    changeStatus,
    changingStatus: statusMutation.isPending,
    linkOrganization,
    linkingOrganization: linkOrganizationMutation.isPending,
  }
}
