export type CampaignTrigger = "post_service" | "birthday" | "inactivity"

export interface CampaignTriggerDefault {
  subject: string
  body: string
}

export interface CampaignSettingsDefaults {
  post_service: CampaignTriggerDefault
  birthday: CampaignTriggerDefault
  inactivity: CampaignTriggerDefault
}

/**
 * Espelha o retorno de `GET /orgs/:orgId/campaign-settings`. Campos de texto
 * `null` indicam que a organização segue o texto padrão do produto (exposto em
 * `defaults`, com chaves snake_case por gatilho).
 */
export interface CampaignSettings {
  orgId: string
  postServiceEnabled: boolean
  birthdayEnabled: boolean
  inactivityEnabled: boolean
  inactivityMonths: number
  postServiceSubject: string | null
  postServiceBody: string | null
  birthdaySubject: string | null
  birthdayBody: string | null
  inactivitySubject: string | null
  inactivityBody: string | null
  defaults: CampaignSettingsDefaults
}

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
