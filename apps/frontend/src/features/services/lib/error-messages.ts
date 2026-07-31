import { ApiError } from "@/infrastructure/api/client"

export interface ServiceErrorMessage {
  title: string
  description: string
  variant: "destructive" | "warning"
}

const GENERIC_TITLE = "Não foi possível lançar o serviço"

/**
 * Reaproveitado pelo alerta preventivo do service-form.tsx (checkAgeRequirement
 * === "minor") para não duplicar o texto legal curado em dois lugares.
 */
export const AGE_VERIFICATION_REQUIRED_MESSAGE: ServiceErrorMessage = {
  title: "Serviço restrito a maiores de 18 anos",
  description:
    "Este tipo de serviço está configurado para exigir maioridade. O cliente selecionado não tinha 18 anos completos na data do atendimento, e o estabelecimento não pode realizar o procedimento. Se a idade estiver incorreta, confira a data de nascimento no cadastro do cliente.",
  variant: "destructive",
}

const CODE_MESSAGES: Record<string, ServiceErrorMessage> = {
  SERVICE_AGE_VERIFICATION_REQUIRED: AGE_VERIFICATION_REQUIRED_MESSAGE,
  SERVICE_MATERIAL_REQUIRED: {
    title: "Material obrigatório",
    description:
      "Este tipo de serviço exige ao menos um material consumido para ser lançado.",
    variant: "destructive",
  },
  SERVICE_PERFORMED_AT_FUTURE: {
    title: "Data de execução inválida",
    description: "A data de execução não pode estar no futuro.",
    variant: "destructive",
  },
  SERVICE_TYPE_NOT_FOUND: {
    title: "Tipo de serviço não encontrado",
    description:
      "O tipo de serviço selecionado não existe mais. Atualize a página e tente novamente.",
    variant: "destructive",
  },
  CUSTOMER_DISABLED: {
    title: "Cliente inativo",
    description:
      "Este cliente está desativado e não pode receber novos serviços.",
    variant: "destructive",
  },
  EMPLOYEE_INACTIVE: {
    title: "Profissional inativo",
    description:
      "O profissional selecionado está inativo e não pode ser vinculado a um serviço.",
    variant: "destructive",
  },
  SERVICE_NOT_FOUND: {
    title: "Serviço não encontrado",
    description:
      "Este serviço não existe mais. Atualize a página e tente novamente.",
    variant: "destructive",
  },
  SERVICE_FORBIDDEN: {
    title: "Sem permissão",
    description:
      "Você não tem permissão para realizar esta ação neste serviço.",
    variant: "destructive",
  },
  SERVICE_ALREADY_CANCELED: {
    title: "Serviço já cancelado",
    description: "Este serviço já foi cancelado e não pode ser alterado.",
    variant: "destructive",
  },
}

/**
 * Contrato obrigatório (armadilha de fallback confirmada neste ciclo — ver
 * plano "Revisão ao plano aprovado" item 5): código de ApiError NÃO mapeado
 * aqui (incluindo SUBSCRIPTION_REQUIRED, que client.ts já traduz para pt-BR
 * dentro de ApiError.message) preserva err.message na description — nunca
 * cai em texto genérico que apague a mensagem real.
 */
export function serviceErrorMessage(err: unknown): ServiceErrorMessage {
  if (err instanceof ApiError) {
    if (err.code) {
      const mapped = CODE_MESSAGES[err.code]
      if (mapped) return mapped
    }
    return {
      title: GENERIC_TITLE,
      description: err.message,
      variant: "destructive",
    }
  }
  if (err instanceof Error) {
    return {
      title: GENERIC_TITLE,
      description: err.message,
      variant: "destructive",
    }
  }
  return {
    title: GENERIC_TITLE,
    description: "Falha ao lançar o serviço.",
    variant: "destructive",
  }
}
