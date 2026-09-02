// Injeta DRIZZLE_ADMIN (não DRIZZLE) de propósito: este repositório serve o cron
// cross-org de campanhas, que roda sem contexto de request — sob ADR-0005 o pool
// DRIZZLE resolveria zero linhas SEM erro (bug silencioso). `campaign_sends` não
// tem RLS nem FK; a integridade de (org_id, customer_id) é responsabilidade da
// query de gatilho que originou a linha (ver drizzle-campaign-target.repository).
import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { TiptapDoc } from "../../domain/campaign-body";
import type {
  ICampaignSendRepository,
  RecordCampaignSendInput,
  RetriableCampaignSend,
} from "../../domain/campaign-send.repository.interface";

// `type` (não `interface`): o parâmetro TRow de db.execute exige
// `Record<string, unknown>`, que só um type-alias de objeto satisfaz implicitamente.
type RetriableRow = {
  id: string;
  org_id: string;
  customer_id: string;
  trigger: RetriableCampaignSend["trigger"];
  dedupe_key: string;
  attempt: number;
  customer_name: string;
  customer_email: string;
  org_name: string;
  subject_override: string | null;
  body: TiptapDoc | null;
};

@Injectable()
export class DrizzleCampaignSendRepository implements ICampaignSendRepository {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async record(input: RecordCampaignSendInput): Promise<void> {
    // sentAt segue o CHECK campaign_sends_sent_at_check: NOT NULL em 'sent',
    // NULL em 'failed'. ON CONFLICT DO NOTHING sobre a unique
    // (dedupe_key, attempt, status) — nunca sobre (id).
    await this.db
      .insert(schema.campaignSends)
      .values({
        orgId: input.orgId,
        customerId: input.customerId,
        trigger: input.trigger,
        status: input.status,
        attempt: input.attempt,
        dedupeKey: input.dedupeKey,
        error: input.error ?? null,
        sentAt: input.status === "sent" ? new Date() : null,
      })
      .onConflictDoNothing({
        target: [
          schema.campaignSends.dedupeKey,
          schema.campaignSends.attempt,
          schema.campaignSends.status,
        ],
      });
  }

  async findRetriable(
    maxAttempts: number,
    limit: number,
  ): Promise<RetriableCampaignSend[]> {
    // "Última tentativa é failed": status = 'failed' E não existe linha com o
    // mesmo dedupe_key que seja 'sent'/'bounced' (envio já concluído) E não
    // existe linha com o mesmo dedupe_key e attempt maior (já houve retry).
    // Raw SQL: as duas anti-junções correlacionadas não se expressam bem no
    // query builder. `attempt` é integer -> volta como number.
    //
    // JOINs (mesma forma dos helpers de CampaignTarget): trazem o destinatário,
    // os nomes e a copy custom por gatilho para o cron reenviar sem 2ª ida ao
    // banco. INNER em customers/organizations — sem e-mail válido ou com a org
    // suspensa pelo super_admin NÃO se reenvia. LEFT em campaigns (casa por
    // org_id + trigger): campanha do gatilho deletada entre a tentativa e o
    // retry => cp.subject/cp.body NULL => o retry sai com o default autoral e a
    // linha NÃO é descartada. A allowlist de opt-out espelha os helpers: um
    // cliente que se descadastrou entre a 1ª tentativa e o retry não recebe
    // (LGPD). Uma campanha desligada ou deletada depois da tentativa não impede
    // o retry — a linha já passou pelos gates de flag/canal na tentativa
    // original; o LEFT + fallback default cobre a deleção.
    const { rows } = await this.db.execute<RetriableRow>(sql`
      SELECT
        cs.id,
        cs.org_id,
        cs.customer_id,
        cs.trigger,
        cs.dedupe_key,
        cs.attempt,
        c.name AS customer_name,
        c.email AS customer_email,
        o.name AS org_name,
        cp.subject AS subject_override,
        cp.body AS body
      FROM campaign_sends cs
      INNER JOIN customers c
        ON c.id = cs.customer_id AND c.org_id = cs.org_id
      INNER JOIN organizations o
        ON o.id = cs.org_id AND o.suspended_at IS NULL
      LEFT JOIN campaigns cp ON cp.org_id = cs.org_id AND cp.trigger = cs.trigger
      LEFT JOIN customer_email_preferences p
        ON p.customer_id = cs.customer_id AND p.org_id = cs.org_id
      WHERE cs.status = 'failed'
        AND cs.attempt < ${maxAttempts}
        AND c.enabled = true
        AND btrim(c.email) <> ''
        AND (
          p.id IS NULL
          OR (
            p.unsubscribed_all_at IS NULL
            AND CASE cs.trigger
              WHEN 'post_service' THEN p.post_service_enabled
              WHEN 'birthday' THEN p.birthday_enabled
              WHEN 'inactivity' THEN p.inactivity_enabled
            END = true
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM campaign_sends t
          WHERE t.dedupe_key = cs.dedupe_key
            AND t.status IN ('sent', 'bounced')
        )
        AND NOT EXISTS (
          SELECT 1 FROM campaign_sends t
          WHERE t.dedupe_key = cs.dedupe_key
            AND t.attempt > cs.attempt
        )
      ORDER BY cs.created_at ASC, cs.id ASC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      orgId: r.org_id,
      customerId: r.customer_id,
      trigger: r.trigger,
      dedupeKey: r.dedupe_key,
      attempt: r.attempt,
      customerName: r.customer_name,
      customerEmail: r.customer_email,
      orgName: r.org_name,
      subjectOverride: r.subject_override,
      body: r.body,
    }));
  }
}
