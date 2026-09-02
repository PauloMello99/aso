import type { CampaignTrigger } from "../types"

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
