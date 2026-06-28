import { Inject, Injectable } from "@nestjs/common";
import { desc, eq, sql } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  IStockVerificationRepository,
  OrgDueForCheck,
  VerificationItemInput,
  VerificationSummary,
} from "../../domain/stock-verification.repository.interface";

@Injectable()
export class DrizzleStockVerificationRepository
  implements IStockVerificationRepository
{
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    // cron roda sem contexto de request → usa conexão privilegiada
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async getInterval(orgId: string): Promise<number | null> {
    const [row] = await this.db
      .select({ days: schema.organizations.stockCheckIntervalDays })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, orgId))
      .limit(1);
    return row?.days ?? null;
  }

  async setInterval(orgId: string, days: number | null): Promise<void> {
    await this.db
      .update(schema.organizations)
      .set({ stockCheckIntervalDays: days, updatedAt: new Date() })
      .where(eq(schema.organizations.id, orgId));
  }

  async lastVerificationAt(orgId: string): Promise<Date | null> {
    const [row] = await this.db
      .select({ createdAt: schema.stockVerifications.createdAt })
      .from(schema.stockVerifications)
      .where(eq(schema.stockVerifications.orgId, orgId))
      .orderBy(desc(schema.stockVerifications.createdAt))
      .limit(1);
    return row?.createdAt ?? null;
  }

  async create(data: {
    orgId: string;
    performedBy: string | null;
    note: string | null;
    items: VerificationItemInput[];
  }): Promise<string> {
    const [header] = await this.db
      .insert(schema.stockVerifications)
      .values({
        orgId: data.orgId,
        performedBy: data.performedBy,
        note: data.note,
      })
      .returning({ id: schema.stockVerifications.id });

    const verificationId = header!.id;
    if (data.items.length > 0) {
      await this.db.insert(schema.stockVerificationItems).values(
        data.items.map((i) => ({
          verificationId,
          materialId: i.materialId,
          systemQuantity: i.systemQuantity,
          physicalQuantity: i.physicalQuantity,
        })),
      );
    }
    return verificationId;
  }

  async listByOrg(orgId: string): Promise<VerificationSummary[]> {
    const { rows } = await this.db.execute<{
      id: string;
      performed_by: string | null;
      note: string | null;
      created_at: Date;
      item_count: string;
      discrepancy_count: string;
    }>(sql`
      SELECT sv.id, sv.performed_by, sv.note, sv.created_at,
        COUNT(svi.id) AS item_count,
        COUNT(svi.id) FILTER (WHERE svi.physical_quantity <> svi.system_quantity) AS discrepancy_count
      FROM stock_verifications sv
      LEFT JOIN stock_verification_items svi ON svi.verification_id = sv.id
      WHERE sv.org_id = ${orgId}
      GROUP BY sv.id
      ORDER BY sv.created_at DESC
      LIMIT 50
    `);
    return rows.map((r) => ({
      id: r.id,
      performedBy: r.performed_by,
      note: r.note,
      createdAt: r.created_at,
      itemCount: Number(r.item_count),
      discrepancyCount: Number(r.discrepancy_count),
    }));
  }

  async findOrgsDue(): Promise<OrgDueForCheck[]> {
    const { rows } = await this.admin.execute<{
      org_id: string;
      interval_days: number;
      last_check_at: Date | null;
    }>(sql`
      SELECT o.id AS org_id,
        o.stock_check_interval_days AS interval_days,
        MAX(sv.created_at) AS last_check_at
      FROM organizations o
      LEFT JOIN stock_verifications sv ON sv.org_id = o.id
      WHERE o.stock_check_interval_days IS NOT NULL
      GROUP BY o.id, o.stock_check_interval_days
      HAVING MAX(sv.created_at) IS NULL
        OR MAX(sv.created_at) < now() - (o.stock_check_interval_days || ' days')::interval
    `);
    return rows.map((r) => ({
      orgId: r.org_id,
      intervalDays: r.interval_days,
      lastCheckAt: r.last_check_at,
    }));
  }

  async findOwnerUserIds(orgId: string): Promise<string[]> {
    const rows = await this.admin
      .select({ userId: schema.orgMemberships.userId })
      .from(schema.orgMemberships)
      .where(
        sql`${schema.orgMemberships.orgId} = ${orgId} AND ${schema.orgMemberships.role} = 'owner' AND ${schema.orgMemberships.enabled} = true`,
      );
    return rows.map((r) => r.userId);
  }
}
