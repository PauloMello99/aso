import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CreateServiceMediaData,
  IServiceMediaRepository,
  ServiceMediaRecord,
} from "../../domain/service-media.repository.interface";

function toRecord(
  row: typeof schema.serviceMedia.$inferSelect,
): ServiceMediaRecord {
  return {
    id: row.id,
    orgId: row.orgId,
    serviceId: row.serviceId,
    storagePath: row.storagePath,
    fileName: row.fileName,
    contentType: row.contentType ?? null,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class DrizzleServiceMediaRepository implements IServiceMediaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByService(
    serviceId: string,
    orgId: string,
  ): Promise<ServiceMediaRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.serviceMedia)
      .where(
        and(
          eq(schema.serviceMedia.serviceId, serviceId),
          eq(schema.serviceMedia.orgId, orgId),
        ),
      )
      .orderBy(desc(schema.serviceMedia.createdAt));
    return rows.map(toRecord);
  }

  async findById(
    id: string,
    orgId: string,
  ): Promise<ServiceMediaRecord | null> {
    const [row] = await this.db
      .select()
      .from(schema.serviceMedia)
      .where(
        and(eq(schema.serviceMedia.id, id), eq(schema.serviceMedia.orgId, orgId)),
      )
      .limit(1);
    return row ? toRecord(row) : null;
  }

  async create(data: CreateServiceMediaData): Promise<ServiceMediaRecord> {
    const [row] = await this.db
      .insert(schema.serviceMedia)
      .values({
        orgId: data.orgId,
        serviceId: data.serviceId,
        storagePath: data.storagePath,
        fileName: data.fileName,
        contentType: data.contentType,
        uploadedBy: data.uploadedBy,
      })
      .returning();
    return toRecord(row!);
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.db
      .delete(schema.serviceMedia)
      .where(
        and(eq(schema.serviceMedia.id, id), eq(schema.serviceMedia.orgId, orgId)),
      );
  }

  async countByService(serviceId: string, orgId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(schema.serviceMedia)
      .where(
        and(
          eq(schema.serviceMedia.serviceId, serviceId),
          eq(schema.serviceMedia.orgId, orgId),
        ),
      );
    return row?.value ?? 0;
  }
}
