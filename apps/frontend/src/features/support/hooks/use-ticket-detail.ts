"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/infrastructure/query/query-keys"
import {
  addResponse,
  getTicketDetail,
  reopenTicket,
  uploadAttachment,
} from "../api/support.api"
import type {
  Ticket,
  TicketAttachment,
  TicketResponse,
} from "../schemas/ticket.schema"

export function useTicket(orgId: string, ticketId: string | undefined) {
  const queryClient = useQueryClient()
  const key = queryKeys.support.detail(orgId, ticketId ?? "")

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => getTicketDetail(orgId, ticketId ?? ""),
    enabled: !!orgId && !!ticketId,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: key })
  }

  const addResponseMutation = useMutation({
    mutationFn: (body: { body: string }) =>
      addResponse(orgId, ticketId ?? "", body),
    onSuccess: invalidate,
  })

  const reopenTicketMutation = useMutation({
    mutationFn: () => reopenTicket(orgId, ticketId ?? ""),
    onSuccess: () => {
      invalidate()
      void queryClient.invalidateQueries({
        queryKey: queryKeys.support.all(orgId),
      })
    },
  })

  const uploadAttachmentMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(orgId, ticketId ?? "", file),
    onSuccess: invalidate,
  })

  async function addTicketResponse(body: string): Promise<TicketResponse> {
    return addResponseMutation.mutateAsync({ body })
  }

  async function reopen(): Promise<Ticket> {
    return reopenTicketMutation.mutateAsync()
  }

  async function uploadTicketAttachment(file: File): Promise<TicketAttachment> {
    return uploadAttachmentMutation.mutateAsync(file)
  }

  return {
    ticket: data?.ticket ?? null,
    responses: data?.responses ?? [],
    attachments: data?.attachments ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    addResponse: addTicketResponse,
    addingResponse: addResponseMutation.isPending,
    reopenTicket: reopen,
    reopening: reopenTicketMutation.isPending,
    uploadAttachment: uploadTicketAttachment,
    uploadingAttachment: uploadAttachmentMutation.isPending,
  }
}
