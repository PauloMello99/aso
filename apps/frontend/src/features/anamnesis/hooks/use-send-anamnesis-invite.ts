"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest, ApiError } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"

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
  resent: boolean
}

const SEND_INVITE_ERROR_MESSAGES: Record<string, string> = {
  ANAMNESIS_FORM_NOT_CONFIGURED:
    "Este tipo de serviço não tem ficha de anamnese configurada. Configure em Configurações → Anamnese.",
  ANAMNESIS_INVITE_EMAIL_FAILED:
    "Não foi possível enviar o e-mail com a ficha. Tente novamente em instantes.",
  ANAMNESIS_ALREADY_ANSWERED_CURRENT_VERSION:
    "Este cliente já respondeu a versão atual da ficha para este tipo de serviço. Não enviamos nada.",
}
const DEFAULT_SEND_INVITE_ERROR_MESSAGE =
  "Não foi possível enviar a ficha de anamnese. Tente novamente."

export function sendAnamnesisInviteErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code) {
    if (err.code === "SUBSCRIPTION_REQUIRED") return err.message
    return SEND_INVITE_ERROR_MESSAGES[err.code] ?? DEFAULT_SEND_INVITE_ERROR_MESSAGE
  }
  return DEFAULT_SEND_INVITE_ERROR_MESSAGE
}

export function useSendAnamnesisInvite(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: SendAnamnesisInviteBody) =>
      apiRequest<SendAnamnesisInviteResponse>(
        `/orgs/${orgId}/anamnesis-responses`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.anamnesis.responsesAll(orgId),
      })
    },
  })
}
