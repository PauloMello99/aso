import type { AnamnesisResponseStatus } from "../schemas/anamnesis-responses.schemas"

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

export interface AnamnesisConsent {
  version: string
  text: string
}

export interface AnamnesisPublicLookup {
  questions: AnamnesisQuestion[]
  customerName: string
  organizationName: string
  status: AnamnesisPublicStatus
  expiresAt: string
  consent: AnamnesisConsent
}

export interface AnamnesisAnswerInput {
  questionId: string
  value: string | boolean
}

export type {
  AnamnesisResponseStatus,
  AnamnesisResponseListItem,
  AnamnesisResponseDetail,
} from "../schemas/anamnesis-responses.schemas"

export interface AnamnesisResponsesFilter {
  customerId?: string
  serviceTypeId?: string
  status?: AnamnesisResponseStatus
}

export const ANAMNESIS_RESPONSE_STATUS_LABELS: Record<
  AnamnesisResponseStatus,
  string
> = {
  pending: "Pendente",
  submitted: "Respondida",
  expired: "Expirada",
}
