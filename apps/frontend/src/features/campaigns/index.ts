export { CampaignSettingsPage } from "./components/campaign-settings-page"
export { EmailPreferencesPublicPage } from "./components/email-preferences-public-page"

export {
  useCampaignSettings,
  useUpdateCampaignSettings,
} from "./hooks/use-campaign-settings"
export { useEmailPreferences, useUnsubscribe } from "./hooks/use-email-preferences"

export { campaignSettingsSchema } from "./schemas/campaign-settings.schema"
export type { CampaignSettingsFormValues } from "./schemas/campaign-settings.schema"
export { unsubscribeBodySchema } from "./schemas/email-preferences.schema"
export type { UnsubscribeBody } from "./schemas/email-preferences.schema"

export type {
  CampaignSettings,
  CampaignSettingsDefaults,
  CampaignTrigger,
  CampaignTriggerDefault,
  EmailPreferences,
} from "./types"
