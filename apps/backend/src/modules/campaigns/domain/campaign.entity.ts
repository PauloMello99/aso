import type { TiptapDoc } from "./campaign-body";
import type { CampaignTrigger } from "./campaign-trigger";

/**
 * Uma campanha de e-mail por gatilho de uma org (T6 rework, Fatia 5). Sucessora
 * de `org_campaign_settings` (1 linha/org, colunas por gatilho): agora N linhas
 * por org, UMA por gatilho (UNIQUE `org_id, trigger`).
 *
 * Tipo estrutural sem decorators nem factory — mesmo padrão de `CampaignTarget`
 * em `campaign-target.repository.interface.ts`. Espelha a row de
 * `database/schema/studio/campaigns.ts`:
 *   - `subject`/`body` NULL = usa o texto default autoral do produto.
 *   - `body` é um doc rich-text (`TiptapDoc`), validado no use-case (passo 6).
 *   - `inactivityMonths` só é preenchido quando `trigger === "inactivity"`
 *     (CHECK `campaigns_inactivity_months_check` no banco).
 */
export interface Campaign {
  id: string;
  orgId: string;
  trigger: CampaignTrigger;
  name: string;
  enabled: boolean;
  subject: string | null;
  body: TiptapDoc | null;
  inactivityMonths: number | null;
  createdAt: Date;
  updatedAt: Date;
}
