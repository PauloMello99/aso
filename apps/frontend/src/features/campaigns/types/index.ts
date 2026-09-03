export type CampaignTrigger = "post_service" | "birthday" | "inactivity"

/**
 * Espelha `GET /public/campaigns/preferences/:token` (sem auth).
 */
export interface EmailPreferences {
  orgName: string
  postServiceEnabled: boolean
  birthdayEnabled: boolean
  inactivityEnabled: boolean
  unsubscribedAll: boolean
}
