"use client"

import { useMutation } from "@tanstack/react-query"
import { apiRequest, ApiError } from "@/infrastructure/api/client"

interface SendAnamnesisResponseCopyResponse {
  sentTo: string
}

const SEND_RESPONSE_COPY_ERROR_MESSAGES: Record<string, string> = {
  ANAMNESIS_RESPONSE_NOT_SUBMITTED:
    "Esta ficha ainda não foi respondida, por isso não há documento para enviar.",
  ANAMNESIS_DOCUMENT_UNAVAILABLE:
    "O documento assinado desta ficha ainda não está disponível. Tente novamente em instantes.",
  ANAMNESIS_DOCUMENT_FETCH_FAILED:
    "Não foi possível acessar o PDF no momento. Tente novamente em instantes.",
  ANAMNESIS_RESPONSE_NO_RECIPIENT:
    "Este cliente não tem um e-mail cadastrado para receber a ficha.",
  ANAMNESIS_INVITE_EMAIL_FAILED:
    "Não foi possível enviar o e-mail com a ficha. Tente novamente em instantes.",
}
const DEFAULT_SEND_RESPONSE_COPY_ERROR_MESSAGE =
  "Não foi possível enviar a ficha por e-mail. Tente novamente."

export function sendAnamnesisCopyErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code) {
    if (err.code === "SUBSCRIPTION_REQUIRED") return err.message
    return (
      SEND_RESPONSE_COPY_ERROR_MESSAGES[err.code] ??
      DEFAULT_SEND_RESPONSE_COPY_ERROR_MESSAGE
    )
  }
  return DEFAULT_SEND_RESPONSE_COPY_ERROR_MESSAGE
}

export function useSendAnamnesisResponseCopy(orgId: string, responseId: string) {
  return useMutation({
    mutationFn: () =>
      apiRequest<SendAnamnesisResponseCopyResponse>(
        `/orgs/${orgId}/anamnesis-responses/${responseId}/send-copy`,
        { method: "POST" },
      ),
  })
}
