// Injeta DRIZZLE normal (não DRIZZLE_ADMIN): serve a UI do dono (T6 Bloco B),
// que roda no contexto do request. As policies da migration 0062 fazem o
// escopo — SELECT `is_super_admin() OR is_org_member(org_id)`, INSERT/UPDATE
// `is_super_admin() OR is_org_owner(org_id)`. O repo `DRIZZLE_ADMIN` do Bloco A
// (drizzle-org-campaign-settings.repository.ts) é do cron cross-org e fica
// intocado.
import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  IOrgCampaignSettingsWriteRepository,
  OrgCampaignSettingsView,
  UpsertOrgCampaignSettingsData,
} from "../../domain/org-campaign-settings.repository.interface";

type SettingsRow = Pick<
  typeof schema.orgCampaignSettings.$inferSelect,
  keyof OrgCampaignSettingsView
>;

@Injectable()
export class DrizzleOrgCampaignSettingsWriteRepository
  implements IOrgCampaignSettingsWriteRepository
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

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
    return row ? this.toView(row) : null;
  }

  async upsert(
    orgId: string,
    data: UpsertOrgCampaignSettingsData,
  ): Promise<OrgCampaignSettingsView> {
    // A tabela não tem trigger de updated_at (migration 0062) — setar explícito.
    const values = {
      postServiceEnabled: data.postServiceEnabled,
      birthdayEnabled: data.birthdayEnabled,
      inactivityEnabled: data.inactivityEnabled,
      inactivityMonths: data.inactivityMonths,
      postServiceSubject: data.postServiceSubject,
      postServiceBody: data.postServiceBody,
      birthdaySubject: data.birthdaySubject,
      birthdayBody: data.birthdayBody,
      inactivitySubject: data.inactivitySubject,
      inactivityBody: data.inactivityBody,
    };

    const [row] = await this.db
      .insert(schema.orgCampaignSettings)
      .values({ orgId, ...values })
      .onConflictDoUpdate({
        target: schema.orgCampaignSettings.orgId,
        set: { ...values, updatedAt: new Date() },
      })
      .returning({
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
      });

    return this.toView(row!);
  }

  private toView(row: SettingsRow): OrgCampaignSettingsView {
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
