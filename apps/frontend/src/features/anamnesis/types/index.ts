export type AnamnesisQuestionType = "text" | "yes_no"

export interface AnamnesisQuestion {
  id: string
  type: AnamnesisQuestionType
  label: string
  required: boolean
}

export interface AnamnesisFormVersion {
  id: string
  formId: string
  versionNumber: number
  questions: AnamnesisQuestion[]
  createdBy: string | null
  createdAt: string
}

export const ANAMNESIS_QUESTION_TYPES: AnamnesisQuestionType[] = [
  "text",
  "yes_no",
]

export const ANAMNESIS_QUESTION_TYPE_LABELS: Record<
  AnamnesisQuestionType,
  string
> = {
  text: "Texto livre",
  yes_no: "Sim / Não",
}

export type AnamnesisPublicStatus = "pending" | "submitted" | "expired"

/** Retorno da consulta pública da ficha de anamnese pelo token (M10b, sem auth). */
export interface AnamnesisPublicLookup {
  questions: AnamnesisQuestion[]
  customerName: string
  status: AnamnesisPublicStatus
  expiresAt: string
}

/** Uma resposta enviada no submit público da ficha de anamnese. */
export interface AnamnesisAnswerInput {
  questionId: string
  value: string | boolean
}
