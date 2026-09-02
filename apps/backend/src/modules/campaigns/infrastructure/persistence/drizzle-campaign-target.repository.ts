// Injeta DRIZZLE_ADMIN (não DRIZZLE) de propósito: estes query helpers rodam no
// cron cross-org de campanhas, SEM contexto de request e SEM `orgId` de entrada —
// varrem todas as orgs com uma campanha do gatilho habilitada (`cp.enabled`). Sob
// ADR-0005 o pool DRIZZLE resolveria zero linhas SEM erro (bug silencioso).
// `campaign_sends` não tem FK nem RLS: `orgId`/`customerId` do resultado são
// projetados da MESMA linha de `customers` (`c.org_id`/`c.id`) que originou o
// gatilho, nunca de `cp`.
//
// O JOIN em `organizations` (só para `o.name`) filtra `o.suspended_at IS NULL`
// nos 3 helpers: uma org suspensa pelo super_admin NÃO dispara campanha.
import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import type { TiptapDoc } from "../../domain/campaign-body";
import { toUtcDateString } from "../../domain/campaign-trigger";
import type {
  CampaignTarget,
  ICampaignTargetRepository,
} from "../../domain/campaign-target.repository.interface";

// `type` (não `interface`): o parâmetro TRow de db.execute exige
// `Record<string, unknown>`, que só um type-alias de objeto satisfaz.
type CampaignTargetRow = {
  org_id: string;
  org_name: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  dedupe_key: string;
  service_id: string | null;
  subject_override: string | null;
  body: TiptapDoc | null;
};

function toTarget(row: CampaignTargetRow): CampaignTarget {
  return {
    orgId: row.org_id,
    orgName: row.org_name,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    dedupeKey: row.dedupe_key,
    serviceId: row.service_id,
    subjectOverride: row.subject_override,
    body: row.body,
  };
}

@Injectable()
export class DrizzleCampaignTargetRepository
  implements ICampaignTargetRepository
{
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async findPostServiceTargets(input: {
    since: Date;
    until: Date;
    limit: number;
  }): Promise<CampaignTarget[]> {
    const { since, until, limit } = input;
    // Uma linha por serviço na janela [since, until): dedupe = 'post_service:' ||
    // s.id. INNER JOIN em services (janela) e campaigns (linha por gatilho:
    // `cp.enabled`), nunca LEFT. `services` tem `org_id` (FK notNull) -> join por
    // (customer_id, org_id). Anti-join: QUALQUER linha de campaign_sends com o
    // dedupe_key.
    const dedupeKeyExpr = sql`'post_service:' || s.id`;
    const { rows } = await this.db.execute<CampaignTargetRow>(sql`
      SELECT
        c.org_id AS org_id,
        o.name AS org_name,
        c.id AS customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        ${dedupeKeyExpr} AS dedupe_key,
        s.id AS service_id,
        cp.subject AS subject_override,
        cp.body AS body
      FROM customers c
      INNER JOIN campaigns cp
        ON cp.org_id = c.org_id AND cp.trigger = 'post_service' AND cp.enabled = true
      INNER JOIN organizations o ON o.id = c.org_id AND o.suspended_at IS NULL
      INNER JOIN services s
        ON s.customer_id = c.id
        AND s.org_id = c.org_id
        AND s.performed_at >= ${since}
        AND s.performed_at < ${until}
        AND s.canceled_at IS NULL
      LEFT JOIN customer_email_preferences p
        ON p.customer_id = c.id AND p.org_id = c.org_id
      WHERE c.enabled = true
        AND btrim(c.email) <> ''
        AND (
          p.id IS NULL
          OR (p.unsubscribed_all_at IS NULL AND p.post_service_enabled = true)
        )
        AND NOT EXISTS (
          SELECT 1 FROM campaign_sends cs WHERE cs.dedupe_key = ${dedupeKeyExpr}
        )
      ORDER BY s.performed_at ASC, s.id ASC
      LIMIT ${limit}
    `);
    return rows.map(toTarget);
  }

  async findBirthdayTargets(input: {
    referenceDate: Date;
    limit: number;
  }): Promise<CampaignTarget[]> {
    const { referenceDate, limit } = input;
    // Ano em UTC, mesma base de buildDedupeKey. Mês/dia como int puro (sem
    // ::date sobre timestamptz) -> comparação independente do TimeZone da
    // sessão. 29/02 não dispara em ano não-bissexto: limitação aceita no MVP.
    const year = toUtcDateString(referenceDate).slice(0, 4);
    const month = referenceDate.getUTCMonth() + 1;
    const day = referenceDate.getUTCDate();
    const dedupeKeyExpr = sql`'birthday:' || c.id || ':' || ${year}`;
    const { rows } = await this.db.execute<CampaignTargetRow>(sql`
      SELECT
        c.org_id AS org_id,
        o.name AS org_name,
        c.id AS customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        ${dedupeKeyExpr} AS dedupe_key,
        NULL::uuid AS service_id,
        cp.subject AS subject_override,
        cp.body AS body
      FROM customers c
      INNER JOIN campaigns cp
        ON cp.org_id = c.org_id AND cp.trigger = 'birthday' AND cp.enabled = true
      INNER JOIN organizations o ON o.id = c.org_id AND o.suspended_at IS NULL
      LEFT JOIN customer_email_preferences p
        ON p.customer_id = c.id AND p.org_id = c.org_id
      WHERE c.enabled = true
        AND btrim(c.email) <> ''
        AND EXTRACT(MONTH FROM c.birth_date)::int = ${month}
        AND EXTRACT(DAY FROM c.birth_date)::int = ${day}
        AND (
          p.id IS NULL
          OR (p.unsubscribed_all_at IS NULL AND p.birthday_enabled = true)
        )
        AND NOT EXISTS (
          SELECT 1 FROM campaign_sends cs WHERE cs.dedupe_key = ${dedupeKeyExpr}
        )
      ORDER BY c.created_at ASC, c.id ASC
      LIMIT ${limit}
    `);
    return rows.map(toTarget);
  }

  async findInactivityTargets(input: {
    referenceDate: Date;
    limit: number;
  }): Promise<CampaignTarget[]> {
    const { referenceDate, limit } = input;
    // Janela vem da campanha de inatividade da PRÓPRIA org (cp.inactivity_months),
    // não é constante. INNER JOIN services + agregação => cliente com ZERO
    // serviços NÃO entra. dedupe = 'inactivity:' || c.id || ':' || <YYYY-MM UTC>.
    // A comparação do HAVING roda `MAX(s.performed_at) AT TIME ZONE 'UTC'` (->
    // timestamp sem fuso, em UTC) contra `${refDate}::date - interval` (também
    // timestamp sem fuso): independe do `TimeZone` da sessão do banco, como o
    // resto do arquivo (D8). Janela em meses -> a escolha de fuso é irrelevante
    // na prática, mas alinha a expressão com os comentários acima.
    const refDate = toUtcDateString(referenceDate);
    const yearMonth = refDate.slice(0, 7);
    const dedupeKeyExpr = sql`'inactivity:' || c.id || ':' || ${yearMonth}`;
    const { rows } = await this.db.execute<CampaignTargetRow>(sql`
      SELECT
        c.org_id AS org_id,
        o.name AS org_name,
        c.id AS customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        ${dedupeKeyExpr} AS dedupe_key,
        NULL::uuid AS service_id,
        cp.subject AS subject_override,
        cp.body AS body
      FROM customers c
      INNER JOIN campaigns cp
        ON cp.org_id = c.org_id AND cp.trigger = 'inactivity' AND cp.enabled = true
      INNER JOIN organizations o ON o.id = c.org_id AND o.suspended_at IS NULL
      INNER JOIN services s
        ON s.customer_id = c.id AND s.org_id = c.org_id AND s.canceled_at IS NULL
      LEFT JOIN customer_email_preferences p
        ON p.customer_id = c.id AND p.org_id = c.org_id
      WHERE c.enabled = true
        AND btrim(c.email) <> ''
        AND (
          p.id IS NULL
          OR (p.unsubscribed_all_at IS NULL AND p.inactivity_enabled = true)
        )
        AND NOT EXISTS (
          SELECT 1 FROM campaign_sends cs WHERE cs.dedupe_key = ${dedupeKeyExpr}
        )
      GROUP BY
        c.org_id, o.name, c.id, c.name, c.email,
        cp.id, cp.subject, cp.inactivity_months
      HAVING (MAX(s.performed_at) AT TIME ZONE 'UTC') < (
        ${refDate}::date - (cp.inactivity_months || ' months')::interval
      )
      ORDER BY MAX(s.performed_at) ASC, c.id ASC
      LIMIT ${limit}
    `);
    return rows.map(toTarget);
  }
}
