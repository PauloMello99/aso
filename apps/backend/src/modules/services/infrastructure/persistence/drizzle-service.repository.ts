import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  PaymentMethod,
  ServiceEntity,
} from "../../domain/service.entity";
import { ServiceMaterialEntity } from "../../domain/service-material.entity";
import {
  CommissionSnapshot,
  CreateServiceData,
  CreateServiceMaterialData,
  IServiceRepository,
  ListServicesFilter,
  ServiceGroupRow,
  UpdateServiceData,
} from "../../domain/service.repository.interface";
import type { CommissionMode } from "../../../cashier/domain/member-commission.entity";
import { AnamnesisResponseAlreadyLinkedException } from "../../../anamnesis/domain/exceptions/anamnesis-response-already-linked.exception";

type ServiceRow = typeof schema.services.$inferSelect;

function pgErrorCode(error: unknown): unknown {
  if (typeof error !== "object" || error === null) return undefined;
  if ("code" in error) return (error as { code?: unknown }).code;
  return undefined;
}

function isUniqueViolation(error: unknown): boolean {
  if (pgErrorCode(error) === "23505") return true;
  if (typeof error === "object" && error !== null && "cause" in error) {
    return pgErrorCode((error as { cause?: unknown }).cause) === "23505";
  }
  return false;
}

interface JoinedNames {
  customerName: string | null;
  employeeName: string | null;
  typeName: string | null;
}

function toDomain(
  row: ServiceRow,
  names: JoinedNames,
  materials: ServiceMaterialEntity[],
): ServiceEntity {
  return ServiceEntity.create({
    id: row.id,
    orgId: row.orgId,
    serviceTypeId: row.serviceTypeId ?? null,
    customerId: row.customerId ?? null,
    paymentTransactionId: row.paymentTransactionId ?? null,
    anamnesisResponseId: row.anamnesisResponseId ?? null,
    performedBy: row.performedBy ?? null,
    createdBy: row.createdBy ?? null,
    description: row.description ?? null,
    amountCents: row.amountCents,
    paymentMethod: row.paymentMethod as PaymentMethod,
    commissionConfigId: row.commissionConfigId ?? null,
    commissionPercent: row.commissionPercent ?? null,
    commissionMode: (row.commissionMode as CommissionMode | null) ?? null,
    commissionBaseCents: row.commissionBaseCents,
    commissionCents: row.commissionCents,
    performedAt: row.performedAt,
    canceledAt: row.canceledAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    materials,
    customerName: names.customerName,
    employeeName: names.employeeName,
    typeName: names.typeName,
  });
}

@Injectable()
export class DrizzleServiceRepository implements IServiceRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(
    data: CreateServiceData,
    materials: CreateServiceMaterialData[],
  ): Promise<ServiceEntity> {
    let row: ServiceRow | undefined;
    try {
      [row] = await this.db
        .insert(schema.services)
        .values({
          orgId: data.orgId,
          serviceTypeId: data.serviceTypeId ?? null,
          customerId: data.customerId ?? null,
          performedBy: data.performedBy ?? null,
          createdBy: data.createdBy ?? null,
          description: data.description ?? null,
          amountCents: data.amountCents,
          paymentMethod: data.paymentMethod,
          anamnesisResponseId: data.anamnesisResponseId ?? null,
          ...(data.performedAt ? { performedAt: data.performedAt } : {}),
        })
        .returning();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AnamnesisResponseAlreadyLinkedException(
          data.anamnesisResponseId ?? "",
        );
      }
      throw error;
    }

    if (materials.length > 0) {
      await this.db.insert(schema.serviceMaterials).values(
        materials.map((m) => ({
          serviceId: row!.id,
          materialId: m.materialId,
          quantity: m.quantity,
        })),
      );
    }

    const fresh = await this.findById(row!.id, data.orgId);
    return fresh!;
  }

  async findById(id: string, orgId: string): Promise<ServiceEntity | null> {
    const [row] = await this.db
      .select({
        service: schema.services,
        customerName: schema.customers.name,
        employeeName: schema.users.name,
        typeName: schema.serviceTypes.name,
      })
      .from(schema.services)
      .leftJoin(
        schema.customers,
        eq(schema.customers.id, schema.services.customerId),
      )
      .leftJoin(schema.users, eq(schema.users.id, schema.services.performedBy))
      .leftJoin(
        schema.serviceTypes,
        eq(schema.serviceTypes.id, schema.services.serviceTypeId),
      )
      .where(and(eq(schema.services.id, id), eq(schema.services.orgId, orgId)))
      .limit(1);

    if (!row) return null;

    const materials = await this.findMaterials(id);
    return toDomain(
      row.service,
      {
        customerName: row.customerName,
        employeeName: row.employeeName,
        typeName: row.typeName,
      },
      materials,
    );
  }

  async findAllByOrg(
    orgId: string,
    filter?: ListServicesFilter,
  ): Promise<ServiceEntity[]> {
    const conditions = [eq(schema.services.orgId, orgId)];

    if (filter?.from) {
      conditions.push(gte(schema.services.performedAt, filter.from));
    }
    if (filter?.to) {
      conditions.push(lte(schema.services.performedAt, filter.to));
    }
    if (filter?.serviceTypeId) {
      conditions.push(eq(schema.services.serviceTypeId, filter.serviceTypeId));
    }
    if (filter?.customerId) {
      conditions.push(eq(schema.services.customerId, filter.customerId));
    }
    if (filter?.performedBy) {
      conditions.push(eq(schema.services.performedBy, filter.performedBy));
    }
    if (filter?.paymentMethod) {
      conditions.push(eq(schema.services.paymentMethod, filter.paymentMethod));
    }
    if (filter?.minCents !== undefined) {
      conditions.push(gte(schema.services.amountCents, filter.minCents));
    }
    if (filter?.maxCents !== undefined) {
      conditions.push(lte(schema.services.amountCents, filter.maxCents));
    }
    if (filter?.status === "canceled") {
      conditions.push(isNotNull(schema.services.canceledAt));
    } else if (filter?.status === "paid") {
      conditions.push(isNull(schema.services.canceledAt));
      conditions.push(isNotNull(schema.services.paymentTransactionId));
    } else if (filter?.status === "pending") {
      conditions.push(isNull(schema.services.canceledAt));
      conditions.push(isNull(schema.services.paymentTransactionId));
    }

    const rows = await this.db
      .select({
        service: schema.services,
        customerName: schema.customers.name,
        employeeName: schema.users.name,
        typeName: schema.serviceTypes.name,
      })
      .from(schema.services)
      .leftJoin(
        schema.customers,
        eq(schema.customers.id, schema.services.customerId),
      )
      .leftJoin(schema.users, eq(schema.users.id, schema.services.performedBy))
      .leftJoin(
        schema.serviceTypes,
        eq(schema.serviceTypes.id, schema.services.serviceTypeId),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.services.performedAt));

    const filtered = filter?.q
      ? rows.filter((r) => {
          const q = filter.q!.toLowerCase();
          return (
            (r.service.description ?? "").toLowerCase().includes(q) ||
            (r.customerName ?? "").toLowerCase().includes(q)
          );
        })
      : rows;

    return filtered.map((r) =>
      toDomain(
        r.service,
        {
          customerName: r.customerName,
          employeeName: r.employeeName,
          typeName: r.typeName,
        },
        [],
      ),
    );
  }

  async setPaymentTransaction(
    id: string,
    transactionId: string,
    commission: CommissionSnapshot,
  ): Promise<void> {
    await this.db
      .update(schema.services)
      .set({
        paymentTransactionId: transactionId,
        commissionConfigId: commission.configId,
        commissionPercent: commission.percent,
        commissionMode: commission.mode,
        commissionBaseCents: commission.baseCents,
        commissionCents: commission.commissionCents,
        updatedAt: new Date(),
      })
      .where(eq(schema.services.id, id));
  }

  async existsByPaymentTransactionId(transactionId: string): Promise<boolean> {
    const result = await this.db
      .select({ id: schema.services.id })
      .from(schema.services)
      .where(eq(schema.services.paymentTransactionId, transactionId))
      .limit(1);
    return result.length > 0;
  }

  async findServiceIdsByTransactionIds(
    orgId: string,
    transactionIds: string[],
  ): Promise<Map<string, string>> {
    if (transactionIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        id: schema.services.id,
        txId: schema.services.paymentTransactionId,
      })
      .from(schema.services)
      .where(
        and(
          eq(schema.services.orgId, orgId),
          inArray(schema.services.paymentTransactionId, transactionIds),
        ),
      );

    const map = new Map<string, string>();
    for (const row of rows) {
      if (row.txId) map.set(row.txId, row.id);
    }
    return map;
  }

  async markCanceled(id: string): Promise<void> {
    await this.db
      .update(schema.services)
      .set({ canceledAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.services.id, id));
  }

  async correctPayment(
    id: string,
    data: { amountCents: number; paymentMethod: PaymentMethod },
    transactionId: string,
    commission: CommissionSnapshot,
  ): Promise<void> {
    await this.db
      .update(schema.services)
      .set({
        amountCents: data.amountCents,
        paymentMethod: data.paymentMethod,
        paymentTransactionId: transactionId,
        commissionConfigId: commission.configId,
        commissionPercent: commission.percent,
        commissionMode: commission.mode,
        commissionBaseCents: commission.baseCents,
        commissionCents: commission.commissionCents,
        updatedAt: new Date(),
      })
      .where(eq(schema.services.id, id));
  }

  async update(id: string, data: UpdateServiceData): Promise<ServiceEntity> {
    try {
      await this.db
        .update(schema.services)
        .set({
          ...(data.serviceTypeId !== undefined && {
            serviceTypeId: data.serviceTypeId,
          }),
          ...(data.customerId !== undefined && { customerId: data.customerId }),
          ...(data.performedBy !== undefined && { performedBy: data.performedBy }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.performedAt !== undefined && { performedAt: data.performedAt }),
          ...(data.anamnesisResponseId !== undefined && {
            anamnesisResponseId: data.anamnesisResponseId,
          }),
          updatedAt: new Date(),
        })
        .where(eq(schema.services.id, id));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AnamnesisResponseAlreadyLinkedException(
          data.anamnesisResponseId ?? "",
        );
      }
      throw error;
    }

    const [row] = await this.db
      .select({ orgId: schema.services.orgId })
      .from(schema.services)
      .where(eq(schema.services.id, id))
      .limit(1);
    const fresh = await this.findById(id, row!.orgId);
    return fresh!;
  }

  async materialCostCentsByPeriod(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const { rows } = await this.db.execute<{ cost_cents: string }>(sql`
      SELECT COALESCE(
        ROUND(SUM(sm.quantity * m.cost_per_unit) * 100),
        0
      )::bigint AS cost_cents
      FROM service_materials sm
      JOIN services s ON s.id = sm.service_id
      JOIN materials m ON m.id = sm.material_id
      WHERE s.org_id = ${orgId}
        AND s.canceled_at IS NULL
        AND s.performed_at >= ${from}
        AND s.performed_at <= ${to}
        AND m.cost_per_unit IS NOT NULL
    `);
    return Number(rows[0]?.cost_cents ?? 0);
  }

  async countAndRevenueByType(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<ServiceGroupRow[]> {
    const { rows } = await this.db.execute<{
      name: string;
      cnt: number;
      revenue_cents: string;
    }>(sql`
      SELECT COALESCE(st.name, 'Sem tipo') AS name,
        COUNT(*)::int AS cnt,
        COALESCE(SUM(s.amount_cents), 0)::bigint AS revenue_cents
      FROM services s
      LEFT JOIN service_types st ON st.id = s.service_type_id
      WHERE s.org_id = ${orgId}
        AND s.canceled_at IS NULL
        AND s.performed_at >= ${from}
        AND s.performed_at <= ${to}
      GROUP BY COALESCE(st.name, 'Sem tipo')
      ORDER BY revenue_cents DESC
    `);
    return rows.map((r) => ({
      name: r.name,
      count: Number(r.cnt),
      revenueCents: Number(r.revenue_cents),
      commissionCents: 0,
    }));
  }

  async countAndRevenueByProfessional(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<ServiceGroupRow[]> {
    const { rows } = await this.db.execute<{
      name: string;
      cnt: number;
      revenue_cents: string;
      commission_cents: string;
    }>(sql`
      SELECT COALESCE(u.name, 'Sem profissional') AS name,
        COUNT(*)::int AS cnt,
        COALESCE(SUM(s.amount_cents), 0)::bigint AS revenue_cents,
        COALESCE(SUM(s.commission_cents), 0)::bigint AS commission_cents
      FROM services s
      LEFT JOIN users u ON u.id = s.performed_by
      WHERE s.org_id = ${orgId}
        AND s.canceled_at IS NULL
        AND s.performed_at >= ${from}
        AND s.performed_at <= ${to}
      GROUP BY COALESCE(u.name, 'Sem profissional')
      ORDER BY revenue_cents DESC
    `);
    return rows.map((r) => ({
      name: r.name,
      count: Number(r.cnt),
      revenueCents: Number(r.revenue_cents),
      commissionCents: Number(r.commission_cents),
    }));
  }

  async commissionCentsByPeriod(
    orgId: string,
    from: Date,
    to: Date,
    performedBy: string | null,
  ): Promise<number> {
    const performedByFilter =
      performedBy !== null ? sql` AND performed_by = ${performedBy}` : sql``;
    const { rows } = await this.db.execute<{ commission_cents: string }>(sql`
      SELECT COALESCE(SUM(commission_cents), 0)::bigint AS commission_cents
      FROM services
      WHERE org_id = ${orgId}
        AND canceled_at IS NULL
        AND performed_at >= ${from}
        AND performed_at <= ${to}${performedByFilter}
    `);
    return Number(rows[0]?.commission_cents ?? 0);
  }

  private async findMaterials(
    serviceId: string,
  ): Promise<ServiceMaterialEntity[]> {
    const rows = await this.db
      .select({
        item: schema.serviceMaterials,
        materialName: schema.materials.name,
      })
      .from(schema.serviceMaterials)
      .leftJoin(
        schema.materials,
        eq(schema.materials.id, schema.serviceMaterials.materialId),
      )
      .where(eq(schema.serviceMaterials.serviceId, serviceId));

    return rows.map((r) =>
      ServiceMaterialEntity.create({
        id: r.item.id,
        serviceId: r.item.serviceId,
        materialId: r.item.materialId,
        quantity: r.item.quantity,
        materialName: r.materialName,
      }),
    );
  }
}
