"use client"

import { useMutation } from "@tanstack/react-query"
import { apiRequest, ApiError } from "@/infrastructure/api/client"

interface SendAnamnesisInviteBody {
  customerId: string
  serviceTypeId: string
}

interface SendAnamnesisInviteResponse {
  response: {
    id: string
    token: string
    status: "pending" | "submitted"
  }
  fillUrl: string
}

const SEND_INVITE_ERROR_MESSAGES: Record<string, string> = {
  ANAMNESIS_FORM_NOT_CONFIGURED:
    "Este tipo de serviço não tem ficha de anamnese configurada. Configure em Configurações → Anamnese.",
  ANAMNESIS_INVITE_EMAIL_FAILED:
    "Não foi possível enviar o e-mail com a ficha. Tente novamente em instantes.",
}
const DEFAULT_SEND_INVITE_ERROR_MESSAGE =
  "Não foi possível enviar a ficha de anamnese. Tente novamente."

export function sendAnamnesisInviteErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code) {
    return SEND_INVITE_ERROR_MESSAGES[err.code] ?? DEFAULT_SEND_INVITE_ERROR_MESSAGE
  }
  return DEFAULT_SEND_INVITE_ERROR_MESSAGE
}

export function useSendAnamnesisInvite(orgId: string) {
  return useMutation({
    mutationFn: (body: SendAnamnesisInviteBody) =>
      apiRequest<SendAnamnesisInviteResponse>(
        `/orgs/${orgId}/anamnesis-responses`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      ),
  })
}
