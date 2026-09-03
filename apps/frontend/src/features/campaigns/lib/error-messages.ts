import { ApiError } from "@/infrastructure/api/client"

const GENERIC_MESSAGE = "Não foi possível salvar a campanha."

const CODE_MESSAGES: Record<string, string> = {
  CAMPAIGN_TRIGGER_ALREADY_USED:
    "Você já tem uma campanha para este gatilho. Edite a campanha existente.",
  CAMPAIGN_INVALID_INACTIVITY_MONTHS:
    "Informe um período de inatividade entre 1 e 36 meses.",
  CAMPAIGN_INVALID_BODY:
    "O conteúdo do e-mail tem algo que não pode ser enviado. Revise o texto.",
  CAMPAIGN_NOT_FOUND: "Campanha não encontrada.",
  CAMPAIGN_SETTINGS_FORBIDDEN:
    "Você não tem permissão para configurar campanhas.",
}

export function campaignErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code) {
      const mapped = CODE_MESSAGES[err.code]
      if (mapped) return mapped
      // client.ts já traduz SUBSCRIPTION_REQUIRED para uma mensagem pt-BR
      // específica em ApiError.message — não engolir com o fallback genérico.
      if (err.code === "SUBSCRIPTION_REQUIRED") return err.message
    }
    return GENERIC_MESSAGE
  }
  if (err instanceof Error) return err.message
  return GENERIC_MESSAGE
}

const LIST_GENERIC_MESSAGE = "Não foi possível carregar as campanhas."

/**
 * Mensagem pt-BR para falhas do carregamento da lista
 * (`GET /orgs/:orgId/campaigns`). Diferente de `campaignErrorMessage`, não faz
 * passthrough de `err.message`: uma falha de leitura nunca deve exibir o texto
 * cru do backend/JS na tela — cai sempre no genérico pt-BR de leitura.
 */
export function campaignListErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code) {
      const mapped = CODE_MESSAGES[err.code]
      if (mapped) return mapped
      if (err.code === "SUBSCRIPTION_REQUIRED") return err.message
    }
    return LIST_GENERIC_MESSAGE
  }
  return LIST_GENERIC_MESSAGE
}

const IMAGE_GENERIC_MESSAGE = "Não foi possível enviar a imagem. Tente de novo."
/** Reusada pela guarda de tamanho no cliente (editor) e pelo mapeamento abaixo. */
export const IMAGE_TOO_LARGE_MESSAGE = "Imagem muito grande. Máx. 2 MB."
const IMAGE_UNSUPPORTED_MESSAGE =
  "Formato não suportado. Use PNG, JPG, WEBP ou GIF."

/**
 * Mensagem pt-BR para falhas do upload de imagem de campanha
 * (`POST /orgs/:orgId/campaigns/images`). O `ParseFilePipe` do controller
 * rejeita tamanho/mime como `400` com `message` "Validation failed (expected
 * size…/type…)" e SEM `code`; a defesa interna do use-case lança `415`
 * `CAMPAIGN_IMAGE_UNSUPPORTED_TYPE`. Cobrimos as duas formas, mais os códigos
 * HTTP canônicos (`413`/`415`) como camada de fallback.
 */
export function campaignImageErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (
      err.status === 413 ||
      err.code === "PAYLOAD_TOO_LARGE" ||
      (err.status === 400 && /expected size/i.test(err.message))
    ) {
      return IMAGE_TOO_LARGE_MESSAGE
    }
    if (
      err.status === 415 ||
      err.code === "CAMPAIGN_IMAGE_UNSUPPORTED_TYPE" ||
      err.code === "UNSUPPORTED_MEDIA_TYPE" ||
      (err.status === 400 && /expected type/i.test(err.message))
    ) {
      return IMAGE_UNSUPPORTED_MESSAGE
    }
    return IMAGE_GENERIC_MESSAGE
  }
  return IMAGE_GENERIC_MESSAGE
}
