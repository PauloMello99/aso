import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CreateCustomerAttachmentData,
  CustomerAttachmentRecord,
  ICustomerAttachmentRepository,
} from "../../domain/customer-attachment.repository.interface";

function toRecord(
  row: typeof schema.customerAttachments.$inferSelect,
): CustomerAttachmentRecord {
  return {
    id: row.id,
    orgId: row.orgId,
    customerId: row.customerId,
    storagePath: row.storagePath,
    fileName: row.fileName,
    contentType: row.contentType ?? null,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class DrizzleCustomerAttachmentRepository
  implements ICustomerAttachmentRepository
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByCustomer(
    customerId: string,
    orgId: string,
  ): Promise<CustomerAttachmentRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.customerAttachments)
      .where(
        and(
          eq(schema.customerAttachments.customerId, customerId),
          eq(schema.customerAttachments.orgId, orgId),
        ),
      )
      .orderBy(desc(schema.customerAttachments.createdAt));
    return rows.map(toRecord);
  }

  async findById(
    id: string,
    orgId: string,
  ): Promise<CustomerAttachmentRecord | null> {
    const [row] = await this.db
      .select()
      .from(schema.customerAttachments)
      .where(
        and(
          eq(schema.customerAttachments.id, id),
          eq(schema.customerAttachments.orgId, orgId),
        ),
      )
      .limit(1);
    return row ? toRecord(row) : null;
  }

  async create(
    data: CreateCustomerAttachmentData,
  ): Promise<CustomerAttachmentRecord> {
    const [row] = await this.db
      .insert(schema.customerAttachments)
      .values({
        orgId: data.orgId,
        customerId: data.customerId,
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
      .delete(schema.customerAttachments)
      .where(
        and(
          eq(schema.customerAttachments.id, id),
          eq(schema.customerAttachments.orgId, orgId),
        ),
      );
  }

  async updateFileName(
    id: string,
    customerId: string,
    orgId: string,
    fileName: string,
  ): Promise<CustomerAttachmentRecord | null> {
    const [row] = await this.db
      .update(schema.customerAttachments)
      .set({ fileName })
      .where(
        and(
          eq(schema.customerAttachments.id, id),
          eq(schema.customerAttachments.customerId, customerId),
          eq(schema.customerAttachments.orgId, orgId),
        ),
      )
      .returning();
    return row ? toRecord(row) : null;
  }
}
