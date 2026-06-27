import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  PaymentMethod,
  ServiceEntity,
} from "../../domain/service.entity";
import { ServiceMaterialEntity } from "../../domain/service-material.entity";
import {
  CreateServiceData,
  CreateServiceMaterialData,
  IServiceRepository,
  ListServicesFilter,
  UpdateServiceData,
} from "../../domain/service.repository.interface";

type ServiceRow = typeof schema.services.$inferSelect;

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
    performedBy: row.performedBy ?? null,
    createdBy: row.createdBy ?? null,
    description: row.description ?? null,
    amountCents: row.amountCents,
    paymentMethod: row.paymentMethod as PaymentMethod,
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
    const [row] = await this.db
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
        ...(data.performedAt ? { performedAt: data.performedAt } : {}),
      })
      .returning();

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
  ): Promise<void> {
    await this.db
      .update(schema.services)
      .set({ paymentTransactionId: transactionId, updatedAt: new Date() })
      .where(eq(schema.services.id, id));
  }

  async markCanceled(id: string): Promise<void> {
    await this.db
      .update(schema.services)
      .set({ canceledAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.services.id, id));
  }

  async update(id: string, data: UpdateServiceData): Promise<ServiceEntity> {
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
        updatedAt: new Date(),
      })
      .where(eq(schema.services.id, id));

    // orgId garantido pelo caller (use-case já validou findById).
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
    // cost_per_unit é numeric (reais); ×100 → centavos. Serviços cancelados fora.
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
