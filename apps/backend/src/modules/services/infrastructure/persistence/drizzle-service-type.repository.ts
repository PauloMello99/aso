import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { ServiceTypeEntity } from "../../domain/service-type.entity";
import {
  IServiceTypeRepository,
  UpdateServiceTypeData,
} from "../../domain/service-type.repository.interface";

function toDomain(row: typeof schema.serviceTypes.$inferSelect) {
  return ServiceTypeEntity.create({
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    description: row.description ?? null,
    requiresAgeVerification: row.requiresAgeVerification,
  });
}

@Injectable()
export class DrizzleServiceTypeRepository implements IServiceTypeRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByOrg(orgId: string): Promise<ServiceTypeEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.serviceTypes)
      .where(eq(schema.serviceTypes.orgId, orgId))
      .orderBy(asc(schema.serviceTypes.name));
    return rows.map(toDomain);
  }

  async findById(
    id: string,
    orgId: string,
  ): Promise<ServiceTypeEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.serviceTypes)
      .where(
        and(
          eq(schema.serviceTypes.id, id),
          eq(schema.serviceTypes.orgId, orgId),
        ),
      )
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async create(
    orgId: string,
    name: string,
    description?: string | null,
    requiresAgeVerification = false,
  ): Promise<ServiceTypeEntity> {
    const [row] = await this.db
      .insert(schema.serviceTypes)
      .values({
        orgId,
        name,
        description: description ?? null,
        requiresAgeVerification,
      })
      .onConflictDoUpdate({
        target: [schema.serviceTypes.orgId, schema.serviceTypes.name],
        set: { name },
      })
      .returning();
    return toDomain(row!);
  }

  async update(
    id: string,
    orgId: string,
    data: UpdateServiceTypeData,
  ): Promise<ServiceTypeEntity | null> {
    if (
      data.name === undefined &&
      data.description === undefined &&
      data.requiresAgeVerification === undefined
    ) {
      return this.findById(id, orgId);
    }

    const [row] = await this.db
      .update(schema.serviceTypes)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.requiresAgeVerification !== undefined && {
          requiresAgeVerification: data.requiresAgeVerification,
        }),
      })
      .where(
        and(
          eq(schema.serviceTypes.id, id),
          eq(schema.serviceTypes.orgId, orgId),
        ),
      )
      .returning();
    return row ? toDomain(row) : null;
  }
}
