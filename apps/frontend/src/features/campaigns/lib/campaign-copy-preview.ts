import type { CampaignTrigger } from "../types"

/** Nome de exemplo usado na prévia client-side (tokens não são interpolados pelo backend). */
export const PREVIEW_CUSTOMER_NAME = "Maria Silva"

/**
 * Interpola os tokens de personalização na prévia da tela do dono.
 * `{{customerName}}` vira um nome de exemplo fixo; `{{orgName}}` vira o nome
 * real da organização. Usa regex global em vez de `String.prototype.replaceAll`
 * para não depender do alvo de `lib` do tsconfig.
 */
export function interpolateCampaignCopy(template: string, orgName: string): string {
  return template
    .replace(/\{\{\s*customerName\s*\}\}/g, PREVIEW_CUSTOMER_NAME)
    .replace(/\{\{\s*orgName\s*\}\}/g, orgName)
}

/** Primeira linha do rodapé fixo de exemplo mostrado na prévia. */
export function campaignFooterExample(orgName: string): string {
  return `Você recebeu este e-mail porque é cliente de ${orgName}.`
}

/** Segunda linha do rodapé de exemplo (o link real é adicionado pelo backend). */
export const CAMPAIGN_FOOTER_UNSUBSCRIBE_LINE = "Não quero mais receber estes e-mails"

/** Nota fixa exibida abaixo da prévia. */
export const CAMPAIGN_FOOTER_LEGAL_NOTE =
  "O rodapé com o link de descadastro é adicionado automaticamente e exigido por lei. Não pode ser removido."

/** Rótulos dos gatilhos na tela do dono. */
export const OWNER_TRIGGER_LABELS: Record<CampaignTrigger, string> = {
  post_service: "Pós-atendimento",
  birthday: "Aniversário",
  inactivity: "Inatividade",
}

/** Rótulos dos gatilhos na tela pública do cliente. */
export const CLIENT_TRIGGER_LABELS: Record<CampaignTrigger, string> = {
  post_service: "Mensagens após um atendimento",
  birthday: "Mensagem de aniversário",
  inactivity: "Lembrete depois de um tempo sem vir",
}

/** Mensagem de sucesso do descadastro (por gatilho ou global) na tela pública. */
export function unsubscribeSuccessMessage(
  target: CampaignTrigger | "all",
  orgName: string,
): string {
  switch (target) {
    case "post_service":
      return `Pronto. Você não vai mais receber mensagens de pós-atendimento de ${orgName}.`
    case "birthday":
      return `Pronto. Você não vai mais receber a mensagem de aniversário de ${orgName}.`
    case "inactivity":
      return `Pronto. Você não vai mais receber lembretes de ${orgName}.`
    case "all":
      return `Pronto. Você não vai mais receber e-mails de ${orgName}.`
  }
}
