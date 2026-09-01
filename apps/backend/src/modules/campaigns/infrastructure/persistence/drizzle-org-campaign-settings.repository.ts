// Injeta DRIZZLE_ADMIN (não DRIZZLE) de propósito: este repositório serve o
// cron cross-org de campanhas, que roda sem contexto de request — sob ADR-0005
// o pool DRIZZLE resolveria zero linhas SEM erro (bug silencioso). Todo acesso
// escopa explicitamente por `org_id` no WHERE.
//
// A UI do dono (Bloco B: ler/editar as próprias settings) NÃO deve usar este
// repositório: passa por um caminho separado com DRIZZLE normal + RLS.
import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  IOrgCampaignSettingsRepository,
  OrgCampaignSettingsView,
} from "../../domain/org-campaign-settings.repository.interface";

@Injectable()
export class DrizzleOrgCampaignSettingsRepository
  implements IOrgCampaignSettingsRepository
{
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async findByOrgId(orgId: string): Promise<OrgCampaignSettingsView | null> {
    // Lista explícita de colunas (minimização) — omite created_at/updated_at.
    const rows = await this.db
      .select({
        orgId: schema.orgCampaignSettings.orgId,
        postServiceEnabled: schema.orgCampaignSettings.postServiceEnabled,
        birthdayEnabled: schema.orgCampaignSettings.birthdayEnabled,
        inactivityEnabled: schema.orgCampaignSettings.inactivityEnabled,
        inactivityMonths: schema.orgCampaignSettings.inactivityMonths,
        postServiceSubject: schema.orgCampaignSettings.postServiceSubject,
        postServiceBody: schema.orgCampaignSettings.postServiceBody,
        birthdaySubject: schema.orgCampaignSettings.birthdaySubject,
        birthdayBody: schema.orgCampaignSettings.birthdayBody,
        inactivitySubject: schema.orgCampaignSettings.inactivitySubject,
        inactivityBody: schema.orgCampaignSettings.inactivityBody,
      })
      .from(schema.orgCampaignSettings)
      .where(eq(schema.orgCampaignSettings.orgId, orgId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      orgId: row.orgId,
      postServiceEnabled: row.postServiceEnabled,
      birthdayEnabled: row.birthdayEnabled,
      inactivityEnabled: row.inactivityEnabled,
      inactivityMonths: row.inactivityMonths,
      postServiceSubject: row.postServiceSubject,
      postServiceBody: row.postServiceBody,
      birthdaySubject: row.birthdaySubject,
      birthdayBody: row.birthdayBody,
      inactivitySubject: row.inactivitySubject,
      inactivityBody: row.inactivityBody,
    };
  }
}
