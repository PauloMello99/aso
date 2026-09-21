import { z } from "zod"
import { campaignTriggerSchema } from "./campaign.schema"

const campaignDeliveryStatusSchema = z.enum(["sent", "failed", "bounced"])

/**
 * Uma linha do relatório de entrega (`GET /orgs/:orgId/campaigns/deliveries`,
 * D-4.3). `customerName`/`customerEmail` vêm `null` quando o cliente foi
 * excluído (LGPD) depois do envio — a linha do log é preservada mesmo assim.
 * Espelha `CampaignDeliveryReportRow` do backend.
 */
export const campaignDeliveryReportRowSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  customerName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  trigger: campaignTriggerSchema,
  status: campaignDeliveryStatusSchema,
  attempt: z.number().int(),
  error: z.string().nullable(),
  sentAt: z.string().nullable(),
  createdAt: z.string(),
})

export const campaignDeliveryReportSummarySchema = z.object({
  sent: z.number().int(),
  failed: z.number().int(),
  bounced: z.number().int(),
})

/** Resposta completa de `GET /orgs/:orgId/campaigns/deliveries`. */
export const campaignDeliveryReportResponseSchema = z.object({
  summary: campaignDeliveryReportSummarySchema,
  items: z.array(campaignDeliveryReportRowSchema),
})

export type CampaignDeliveryStatus = z.infer<
  typeof campaignDeliveryStatusSchema
>
export type CampaignDeliveryReportRow = z.infer<
  typeof campaignDeliveryReportRowSchema
>
export type CampaignDeliveryReportSummary = z.infer<
  typeof campaignDeliveryReportSummarySchema
>
export type CampaignDeliveryReportResponse = z.infer<
  typeof campaignDeliveryReportResponseSchema
>
