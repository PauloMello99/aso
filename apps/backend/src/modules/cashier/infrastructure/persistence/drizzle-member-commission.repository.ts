import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import { TtlCache } from "../../../../common/cache/ttl-cache.service";
import * as schema from "../../../../database/schema";
import { MemberCommissionEntity } from "../../domain/member-commission.entity";
import {
  IMemberCommissionRepository,
  UpsertMemberCommissionData,
} from "../../domain/member-commission.repository.interface";
import { MemberCommissionMapper } from "./member-commission.mapper";

const COMMISSIONS_TTL_MS = 60 * 60 * 1000;
const commissionsKey = (orgId: string) => `commissions:${orgId}`;

@Injectable()
export class DrizzleMemberCommissionRepository
  implements IMemberCommissionRepository
{
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly cache: TtlCache,
  ) {}

  async findActiveByOrg(orgId: string): Promise<MemberCommissionEntity[]> {
    return this.cache.wrap(commissionsKey(orgId), COMMISSIONS_TTL_MS, async () => {
      const rows = await this.db
        .select()
        .from(schema.orgMemberCommissions)
        .where(
          and(
            eq(schema.orgMemberCommissions.orgId, orgId),
            eq(schema.orgMemberCommissions.active, true),
          ),
        );
      return rows.map(MemberCommissionMapper.toDomain);
    });
  }

  // Leitura pontual usada no caminho de pagamento (calculo da comissao na hora do
  // registro). NAO CACHEAR: um valor stale de ate 1h aqui gravaria o percentual
  // errado num lancamento append-only (commission_percent/commission_cents em
  // `services`), permanentemente, sem chance de correcao automatica.
  async findActiveByOrgAndUser(
    orgId: string,
    userId: string,
  ): Promise<MemberCommissionEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.orgMemberCommissions)
      .where(
        and(
          eq(schema.orgMemberCommissions.orgId, orgId),
          eq(schema.orgMemberCommissions.userId, userId),
          eq(schema.orgMemberCommissions.active, true),
        ),
      )
      .limit(1);
    return row ? MemberCommissionMapper.toDomain(row) : null;
  }

  async findHistoryByOrgAndUser(
    orgId: string,
    userId: string,
  ): Promise<MemberCommissionEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.orgMemberCommissions)
      .where(
        and(
          eq(schema.orgMemberCommissions.orgId, orgId),
          eq(schema.orgMemberCommissions.userId, userId),
        ),
      )
      .orderBy(desc(schema.orgMemberCommissions.createdAt));
    return rows.map(MemberCommissionMapper.toDomain);
  }

  async supersede(
    data: UpsertMemberCommissionData,
  ): Promise<MemberCommissionEntity> {
    const row = await this.db.transaction(async (tx) => {
      // Ordem obrigatoria: o indice unico parcial (org_id, user_id) WHERE active
      // so permite uma linha ativa por vez, entao a linha antiga precisa ser
      // desativada ANTES do insert da nova (confirmado pelo database-guardian).
      await tx
        .update(schema.orgMemberCommissions)
        .set({
          active: false,
          supersededAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.orgMemberCommissions.orgId, data.orgId),
            eq(schema.orgMemberCommissions.userId, data.userId),
            eq(schema.orgMemberCommissions.active, true),
          ),
        );

      const [inserted] = await tx
        .insert(schema.orgMemberCommissions)
        .values({
          orgId: data.orgId,
          userId: data.userId,
          percent: data.percent,
          mode: data.mode,
          active: true,
          createdBy: data.createdBy,
        })
        .returning();

      return inserted!;
    });

    this.cache.del(commissionsKey(data.orgId));
    return MemberCommissionMapper.toDomain(row);
  }
}
