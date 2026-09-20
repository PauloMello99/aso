import type { CampaignDeliveryStatus } from "../schemas/campaign-delivery-report.schema"
import type { CampaignTrigger } from "../types"

export const TRIGGER_LABELS: Record<CampaignTrigger, string> = {
  post_service: "Pós-atendimento",
  birthday: "Aniversário",
  inactivity: "Inatividade",
}

export const DELIVERY_STATUS_LABELS: Record<CampaignDeliveryStatus, string> = {
  sent: "Enviado",
  failed: "Falhou",
  bounced: "Devolvido",
}

export const REMOVED_CUSTOMER_LABEL = "Cliente removido"
export const MISSING_VALUE_LABEL = "—"

export interface DeliveryReason {
  title: string
  detail: string | null
  hint: string | null
}

/**
 * Motivo legível de uma linha do relatório. `error` é o texto técnico do
 * provedor (opcional); `hint` é a orientação de ação para o dono.
 */
export function deliveryReason(
  status: CampaignDeliveryStatus,
  error: string | null,
): DeliveryReason {
  const detail = error && error.trim() !== "" ? error.trim() : null
  switch (status) {
    case "sent":
      return { title: "Aceito pelo provedor de e-mail", detail: null, hint: null }
    case "bounced":
      return {
        title: "E-mail rejeitado pelo destinatário",
        detail,
        hint: "Peça ao cliente para atualizar o cadastro com um e-mail válido.",
      }
    case "failed":
      return {
        title: "Falha no envio",
        detail,
        hint: "Confira o e-mail no cadastro do cliente e peça a atualização, se necessário.",
      }
  }
}

export function recipientName(customerName: string | null): string {
  return customerName && customerName.trim() !== ""
    ? customerName
    : REMOVED_CUSTOMER_LABEL
}

export function recipientEmail(customerEmail: string | null): string {
  return customerEmail && customerEmail.trim() !== ""
    ? customerEmail
    : MISSING_VALUE_LABEL
}
