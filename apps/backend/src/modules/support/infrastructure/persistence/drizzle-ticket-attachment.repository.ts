import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, or } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CreateTicketAttachmentData,
  ITicketAttachmentRepository,
  TicketAttachmentRecord,
} from "../../domain/ticket-attachment.repository.interface";
import { TransactionContext } from "../../domain/ports/transaction-runner.port";

function toRecord(
  row: typeof schema.ticketAttachments.$inferSelect,
): TicketAttachmentRecord {
  return {
    id: row.id,
    ticketId: row.ticketId,
    responseId: row.responseId ?? null,
    orgId: row.orgId,
    storagePath: row.storagePath,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedBy: row.uploadedBy ?? null,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class DrizzleTicketAttachmentRepository
  implements ITicketAttachmentRepository
{
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async createAsAdmin(
    data: CreateTicketAttachmentData,
    tx?: TransactionContext,
  ): Promise<TicketAttachmentRecord> {
    const db = (tx as unknown as DrizzleDB | undefined) ?? this.admin;
    const [row] = await db
      .insert(schema.ticketAttachments)
      .values({
        ticketId: data.ticketId,
        responseId: data.responseId,
        orgId: data.orgId,
        storagePath: data.storagePath,
        fileName: data.fileName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        uploadedBy: data.uploadedBy,
      })
      .returning();
    if (!row) throw new Error("Failed to create ticket attachment");
    return toRecord(row);
  }

  async listByTicketInOrg(
    ticketId: string,
    orgId: string,
  ): Promise<TicketAttachmentRecord[]> {
    const rows = await this.db
      .select({
        id: schema.ticketAttachments.id,
        ticketId: schema.ticketAttachments.ticketId,
        responseId: schema.ticketAttachments.responseId,
        orgId: schema.ticketAttachments.orgId,
        storagePath: schema.ticketAttachments.storagePath,
        fileName: schema.ticketAttachments.fileName,
        mimeType: schema.ticketAttachments.mimeType,
        sizeBytes: schema.ticketAttachments.sizeBytes,
        uploadedBy: schema.ticketAttachments.uploadedBy,
        createdAt: schema.ticketAttachments.createdAt,
      })
      .from(schema.ticketAttachments)
      .leftJoin(
        schema.ticketResponses,
        eq(schema.ticketResponses.id, schema.ticketAttachments.responseId),
      )
      .where(
        and(
          eq(schema.ticketAttachments.ticketId, ticketId),
          eq(schema.ticketAttachments.orgId, orgId),
          // Nunca vazar anexo de nota interna para o portal do cliente.
          or(
            isNull(schema.ticketAttachments.responseId),
            eq(schema.ticketResponses.isInternalNote, false),
          ),
        ),
      );
    return rows.map(toRecord);
  }

  async listByTicketAsAdmin(
    ticketId: string,
  ): Promise<TicketAttachmentRecord[]> {
    const rows = await this.admin
      .select()
      .from(schema.ticketAttachments)
      .where(eq(schema.ticketAttachments.ticketId, ticketId));
    return rows.map(toRecord);
  }

  async findByIdInOrg(
    id: string,
    orgId: string,
  ): Promise<TicketAttachmentRecord | null> {
    const [row] = await this.db
      .select({
        id: schema.ticketAttachments.id,
        ticketId: schema.ticketAttachments.ticketId,
        responseId: schema.ticketAttachments.responseId,
        orgId: schema.ticketAttachments.orgId,
        storagePath: schema.ticketAttachments.storagePath,
        fileName: schema.ticketAttachments.fileName,
        mimeType: schema.ticketAttachments.mimeType,
        sizeBytes: schema.ticketAttachments.sizeBytes,
        uploadedBy: schema.ticketAttachments.uploadedBy,
        createdAt: schema.ticketAttachments.createdAt,
      })
      .from(schema.ticketAttachments)
      .leftJoin(
        schema.ticketResponses,
        eq(schema.ticketResponses.id, schema.ticketAttachments.responseId),
      )
      .where(
        and(
          eq(schema.ticketAttachments.id, id),
          eq(schema.ticketAttachments.orgId, orgId),
          // Nunca vazar anexo de nota interna para o portal do cliente.
          or(
            isNull(schema.ticketAttachments.responseId),
            eq(schema.ticketResponses.isInternalNote, false),
          ),
        ),
      )
      .limit(1);
    return row ? toRecord(row) : null;
  }

  async findByIdAsAdmin(id: string): Promise<TicketAttachmentRecord | null> {
    const [row] = await this.admin
      .select()
      .from(schema.ticketAttachments)
      .where(eq(schema.ticketAttachments.id, id))
      .limit(1);
    return row ? toRecord(row) : null;
  }
}
