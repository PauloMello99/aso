"use client"

import { useMutation } from "@tanstack/react-query"
import { apiRequest, ApiError } from "@/infrastructure/api/client"

interface SendCustomerRegistrationInviteBody {
  email: string
  serviceTypeId: string
}

interface SendCustomerRegistrationInviteResponse {
  id: string
  sent: true
}

const SEND_REGISTRATION_INVITE_ERROR_MESSAGES: Record<string, string> = {
  CUSTOMER_EMAIL_ALREADY_EXISTS:
    "Já existe um cliente com este e-mail nesta organização. Use as opções do cliente já cadastrado (ficha de anamnese ou atualização cadastral).",
  ANAMNESIS_FORM_NOT_CONFIGURED:
    "Este tipo de serviço não tem ficha de anamnese configurada. Configure a ficha em Configurações → Anamnese antes de enviar o convite.",
  CUSTOMER_SELF_REGISTRATION_INVITE_EMAIL_FAILED:
    "Não foi possível enviar o e-mail com o convite. Tente novamente em instantes.",
}
const DEFAULT_SEND_REGISTRATION_INVITE_ERROR_MESSAGE =
  "Não foi possível enviar o convite de cadastro. Tente novamente."

export function sendCustomerRegistrationInviteErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code) {
    if (err.code === "SUBSCRIPTION_REQUIRED") return err.message
    return (
      SEND_REGISTRATION_INVITE_ERROR_MESSAGES[err.code] ??
      DEFAULT_SEND_REGISTRATION_INVITE_ERROR_MESSAGE
    )
  }
  return DEFAULT_SEND_REGISTRATION_INVITE_ERROR_MESSAGE
}

export function useSendCustomerRegistrationInvite(orgId: string) {
  return useMutation({
    mutationFn: (body: SendCustomerRegistrationInviteBody) =>
      apiRequest<SendCustomerRegistrationInviteResponse>(
        `/orgs/${orgId}/registration-invites`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      ),
  })
}
