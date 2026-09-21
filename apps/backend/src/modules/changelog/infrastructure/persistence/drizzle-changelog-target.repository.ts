// Injeta DRIZZLE_ADMIN (não DRIZZLE) de propósito: query cross-org do cron, sem
// contexto de request — sob ADR-0005 o pool DRIZZLE resolveria zero linhas SEM erro.
import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import type {
  ChangelogOwnerTarget,
  IChangelogTargetRepository,
} from "../../domain/changelog-target.repository.interface";

// `type` (não `interface`): TRow de db.execute exige Record<string, unknown>.
type OwnerRow = {
  user_id: string;
  name: string;
  email: string;
};

@Injectable()
export class DrizzleChangelogTargetRepository
  implements IChangelogTargetRepository
{
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async findOwnersToNotify(
    entryId: string,
    publishedAt: string,
    limit: number,
  ): Promise<ChangelogOwnerTarget[]> {
    // Donos (org_memberships.role = 'owner' e enabled = true — membro desabilitado
    // não recebe e-mail, como em findOwnerUserIds) de orgs NÃO suspensas. super_admin
    // NÃO é sintetizado como owner aqui: a equivalência da ADR-0013 vale para
    // autorização, não para targeting de e-mail. `org_memberships.user_id` é
    // `users.id` (não auth_id) e o `user_id` gravado em changelog_notifications
    // DEVE ser este `u.id` da mesma linha. DISTINCT ON (u.id): dono de N orgs
    // gera 1 linha. Opt-out (LGPD), e-mail em branco, usuário criado depois do
    // FIM do dia da publicação (comparação por dia em UTC, independente do
    // TimeZone da sessão; `publishedAt` é data pura; quem se cadastrou no
    // próprio dia é elegível) e já notificado
    // (anti-join por entry_id) ficam de fora. A ordenação externa é estável
    // (created_at, id) para o LIMIT paginar de forma determinística.
    const { rows } = await this.db.execute<OwnerRow>(sql`
      SELECT t.user_id, t.name, t.email
      FROM (
        SELECT DISTINCT ON (u.id)
          u.id AS user_id,
          u.name AS name,
          u.email AS email,
          u.created_at AS created_at
        FROM users u
        INNER JOIN org_memberships om
          ON om.user_id = u.id AND om.role = 'owner' AND om.enabled = true
        INNER JOIN organizations o
          ON o.id = om.org_id AND o.suspended_at IS NULL
        WHERE btrim(u.email) <> ''
          AND u.product_updates_opted_out_at IS NULL
          AND u.created_at < ((${publishedAt}::date + 1)::timestamp AT TIME ZONE 'UTC')
          AND NOT EXISTS (
            SELECT 1 FROM changelog_notifications cn
            WHERE cn.user_id = u.id AND cn.entry_id = ${entryId}
          )
        ORDER BY u.id
      ) t
      ORDER BY t.created_at ASC, t.user_id ASC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      userId: r.user_id,
      name: r.name,
      email: r.email,
    }));
  }
}
