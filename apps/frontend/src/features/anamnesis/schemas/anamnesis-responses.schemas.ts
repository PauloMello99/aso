import { z } from "zod"
import { anamnesisQuestionSchema } from "./anamnesis.schemas"

export const anamnesisResponseStatusSchema = z.enum([
  "pending",
  "submitted",
  "expired",
])

const anamnesisAnswerSchema = z.object({
  questionId: z.string(),
  value: z.union([z.string(), z.boolean()]),
})

export const anamnesisResponseListItemSchema = z.object({
  id: z.string(),
  customerId: z.string().nullable(),
  customerName: z.string().nullable(),
  serviceTypeId: z.string().nullable(),
  serviceTypeName: z.string().nullable(),
  status: anamnesisResponseStatusSchema,
  submittedAt: z.string().nullable(),
  createdAt: z.string(),
  formVersionId: z.string().nullable(),
  versionNumber: z.number().nullable(),
})

export const anamnesisResponseDetailSchema = anamnesisResponseListItemSchema.extend({
  answers: z.array(anamnesisAnswerSchema).nullable(),
  questionsSnapshot: z.array(anamnesisQuestionSchema),
  signerFullName: z.string().nullable(),
  signerCpf: z.string().nullable(),
  pdfUrl: z.string().nullable(),
  signatureUrl: z.string().nullable(),
  consentTextSnapshot: z.string().nullable(),
  consentAcceptedAt: z.string().nullable(),
})

export type AnamnesisResponseStatus = z.infer<typeof anamnesisResponseStatusSchema>
export type AnamnesisResponseListItem = z.infer<
  typeof anamnesisResponseListItemSchema
>
export type AnamnesisResponseDetail = z.infer<typeof anamnesisResponseDetailSchema>
