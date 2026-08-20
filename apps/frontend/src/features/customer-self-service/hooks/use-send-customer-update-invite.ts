"use client"

import { useMutation } from "@tanstack/react-query"
import { apiRequest, ApiError } from "@/infrastructure/api/client"

interface SendCustomerUpdateInviteResponse {
  id: string
  sent: true
}

const SEND_UPDATE_INVITE_ERROR_MESSAGES: Record<string, string> = {
  CUSTOMER_NOT_FOUND: "Cliente não encontrado.",
  CUSTOMER_UPDATE_INVITATION_INVITE_EMAIL_FAILED:
    "Não foi possível enviar o e-mail com o convite. Tente novamente em instantes.",
}
const DEFAULT_SEND_UPDATE_INVITE_ERROR_MESSAGE =
  "Não foi possível enviar o convite de atualização cadastral. Tente novamente."

export function sendCustomerUpdateInviteErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code) {
    if (err.code === "SUBSCRIPTION_REQUIRED") return err.message
    return (
      SEND_UPDATE_INVITE_ERROR_MESSAGES[err.code] ??
      DEFAULT_SEND_UPDATE_INVITE_ERROR_MESSAGE
    )
  }
  return DEFAULT_SEND_UPDATE_INVITE_ERROR_MESSAGE
}

export function useSendCustomerUpdateInvite(orgId: string, customerId: string) {
  return useMutation({
    mutationFn: () =>
      apiRequest<SendCustomerUpdateInviteResponse>(
        `/orgs/${orgId}/customers/${customerId}/update-invites`,
        { method: "POST" },
      ),
  })
}
