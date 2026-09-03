// Injeta DRIZZLE_ADMIN (não DRIZZLE) de propósito: este repositório serve o
// endpoint público de opt-out (sem sessão) e o cron cross-org. Sob ADR-0005 o
// pool DRIZZLE resolve as claims de RLS por request; sem contexto de request
// ele retorna zero linhas SEM erro, o que aqui seria um bug silencioso.
// DRIZZLE_ADMIN faz bypass de RLS — todo acesso escopa explicitamente por
// `unsubscribe_token` ou por `(customer_id, org_id)` no WHERE.
import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { CampaignTrigger } from "../../domain/campaign-trigger";
import type {
  CustomerEmailPreferenceView,
  ICustomerEmailPreferenceRepository,
} from "../../domain/customer-email-preference.repository.interface";

// `trigger` do domínio -> coluna de flag do schema. `satisfies Record<...>`
// valida os nomes de coluna e força as três chaves (exaustivo por construção),
// sem alargar o tipo dos valores — cada valor continua um objeto com a
// propriedade presente, então o spread em `.set()` é aceito sem ruído de
// `exactOptionalPropertyTypes`.
const DISABLE_PATCH_BY_TRIGGER = {
  post_service: { postServiceEnabled: false },
  birthday: { birthdayEnabled: false },
  inactivity: { inactivityEnabled: false },
} satisfies Record<
  CampaignTrigger,
  Partial<typeof schema.customerEmailPreferences.$inferInsert>
>;

@Injectable()
export class DrizzleCustomerEmailPreferenceRepository
  implements ICustomerEmailPreferenceRepository
{
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async ensureForCustomer(
    customerId: string,
    orgId: string,
  ): Promise<{ unsubscribeToken: string }> {
    // ON CONFLICT sobre a unique (customer_id, org_id) — NUNCA sobre
    // unsubscribe_token. `target` como lista de colunas: Drizzle não expõe a
    // forma `ON CONSTRAINT <nome>`, mas Postgres infere a mesma unique
    // (`customer_email_preferences_customer_org_uq`). Não trocar por [token].
    const inserted = await this.db
      .insert(schema.customerEmailPreferences)
      .values({ customerId, orgId })
      .onConflictDoNothing({
        target: [
          schema.customerEmailPreferences.customerId,
          schema.customerEmailPreferences.orgId,
        ],
      })
      .returning({
        unsubscribeToken: schema.customerEmailPreferences.unsubscribeToken,
      });

    if (inserted[0]) {
      return { unsubscribeToken: inserted[0].unsubscribeToken };
    }

    // A linha já existia (ON CONFLICT DO NOTHING não retorna nada). O SELECT de
    // fallback roda na MESMA conexão DRIZZLE_ADMIN — gotcha read-what-I-wrote.
    const existing = await this.db
      .select({
        unsubscribeToken: schema.customerEmailPreferences.unsubscribeToken,
      })
      .from(schema.customerEmailPreferences)
      .where(
        and(
          eq(schema.customerEmailPreferences.customerId, customerId),
          eq(schema.customerEmailPreferences.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error(
        "ensureForCustomer: preferência não encontrada após ON CONFLICT DO NOTHING",
      );
    }
    return { unsubscribeToken: existing[0].unsubscribeToken };
  }

  async findByUnsubscribeToken(
    token: string,
  ): Promise<CustomerEmailPreferenceView | null> {
    // Lista explícita de colunas (minimização). INNER JOIN não descarta linhas:
    // org_id é FK ON DELETE CASCADE. Sem filtro de `suspended_at` — um cliente
    // precisa poder sair mesmo de uma org suspensa.
    const rows = await this.db
      .select({
        orgId: schema.customerEmailPreferences.orgId,
        orgName: schema.organizations.name,
        postServiceEnabled: schema.customerEmailPreferences.postServiceEnabled,
        birthdayEnabled: schema.customerEmailPreferences.birthdayEnabled,
        inactivityEnabled: schema.customerEmailPreferences.inactivityEnabled,
        unsubscribedAllAt: schema.customerEmailPreferences.unsubscribedAllAt,
      })
      .from(schema.customerEmailPreferences)
      .innerJoin(
        schema.organizations,
        eq(schema.organizations.id, schema.customerEmailPreferences.orgId),
      )
      .where(eq(schema.customerEmailPreferences.unsubscribeToken, token))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      orgId: row.orgId,
      orgName: row.orgName,
      postServiceEnabled: row.postServiceEnabled,
      birthdayEnabled: row.birthdayEnabled,
      inactivityEnabled: row.inactivityEnabled,
      unsubscribedAll: row.unsubscribedAllAt !== null,
    };
  }

  async unsubscribeAll(token: string, at: Date): Promise<boolean> {
    // Sem `WHERE unsubscribed_all_at IS NULL` (idempotência: a 2ª chamada
    // também devolve true). COALESCE preserva o PRIMEIRO instante de retirada
    // de consentimento — é ele que tem valor jurídico (LGPD); uma 2ª chamada
    // não sobrescreve o timestamp original.
    const updated = await this.db
      .update(schema.customerEmailPreferences)
      .set({
        unsubscribedAllAt: sql`COALESCE(${schema.customerEmailPreferences.unsubscribedAllAt}, ${at}::timestamptz)`,
        updatedAt: new Date(),
      })
      .where(eq(schema.customerEmailPreferences.unsubscribeToken, token))
      .returning({ id: schema.customerEmailPreferences.id });

    return updated.length > 0;
  }

  async unsubscribeTrigger(
    token: string,
    trigger: CampaignTrigger,
  ): Promise<boolean> {
    // `updated_at` não tem trigger no banco -> seta explícito em todo UPDATE.
    const updated = await this.db
      .update(schema.customerEmailPreferences)
      .set({ ...DISABLE_PATCH_BY_TRIGGER[trigger], updatedAt: new Date() })
      .where(eq(schema.customerEmailPreferences.unsubscribeToken, token))
      .returning({ id: schema.customerEmailPreferences.id });

    return updated.length > 0;
  }
}
