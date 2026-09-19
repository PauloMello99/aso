export { EmailPreferencesPublicPage } from "./components/email-preferences-public-page"
export { CampaignsListPage } from "./components/campaigns-list-page"

export { useEmailPreferences, useUnsubscribe } from "./hooks/use-email-preferences"
export { useCampaigns } from "./hooks/use-campaigns"
export { useCampaignDeliveryReport } from "./hooks/use-campaign-delivery-report"

export {
  campaignDeliveryReportResponseSchema,
  campaignDeliveryReportRowSchema,
  campaignDeliveryReportSummarySchema,
} from "./schemas/campaign-delivery-report.schema"
export type {
  CampaignDeliveryReportResponse,
  CampaignDeliveryReportRow,
  CampaignDeliveryReportSummary,
  CampaignDeliveryStatus,
} from "./schemas/campaign-delivery-report.schema"

export { unsubscribeBodySchema } from "./schemas/email-preferences.schema"
export type { UnsubscribeBody } from "./schemas/email-preferences.schema"

export {
  campaignBodySchema,
  campaignSchema,
  campaignTriggerSchema,
  createCampaignSchema,
  listCampaignsResponseSchema,
  updateCampaignSchema,
} from "./schemas/campaign.schema"
export type {
  Campaign,
  CampaignBody,
  CreateCampaignInput,
  ListCampaignsResponse,
  UpdateCampaignInput,
} from "./schemas/campaign.schema"

export type { CampaignTrigger, EmailPreferences } from "./types"
