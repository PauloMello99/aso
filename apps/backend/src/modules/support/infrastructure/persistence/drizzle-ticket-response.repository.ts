import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { TicketResponseEntity } from "../../domain/ticket-response.entity";
import { ITicketResponseRepository } from "../../domain/ticket-response.repository.interface";
import { TransactionContext } from "../../domain/ports/transaction-runner.port";
import { TicketMapper } from "./ticket.mapper";

@Injectable()
export class DrizzleTicketResponseRepository
  implements ITicketResponseRepository
{
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async createAsAdmin(
    response: TicketResponseEntity,
    tx?: TransactionContext,
  ): Promise<TicketResponseEntity> {
    const db = (tx as unknown as DrizzleDB | undefined) ?? this.admin;
    const [row] = await db
      .insert(schema.ticketResponses)
      .values({
        id: response.id,
        ticketId: response.ticketId,
        orgId: response.orgId,
        authorType: response.authorType,
        authorUserId: response.authorUserId,
        body: response.body,
        isInternalNote: response.isInternalNote,
        createdAt: response.createdAt,
      })
      .returning();
    if (!row) throw new Error("Failed to create ticket response");
    return TicketMapper.toResponseDomain(row);
  }

  async listByTicketInOrg(
    ticketId: string,
    orgId: string,
    includeInternal: boolean,
  ): Promise<TicketResponseEntity[]> {
    const conditions = [
      eq(schema.ticketResponses.ticketId, ticketId),
      eq(schema.ticketResponses.orgId, orgId),
    ];
    if (!includeInternal) {
      conditions.push(eq(schema.ticketResponses.isInternalNote, false));
    }

    const rows = await this.db
      .select()
      .from(schema.ticketResponses)
      .where(and(...conditions))
      .orderBy(asc(schema.ticketResponses.createdAt));

    return rows.map(TicketMapper.toResponseDomain);
  }

  async listByTicketAsAdmin(
    ticketId: string,
    includeInternal: boolean,
  ): Promise<TicketResponseEntity[]> {
    const conditions = [eq(schema.ticketResponses.ticketId, ticketId)];
    if (!includeInternal) {
      conditions.push(eq(schema.ticketResponses.isInternalNote, false));
    }

    const rows = await this.admin
      .select()
      .from(schema.ticketResponses)
      .where(and(...conditions))
      .orderBy(asc(schema.ticketResponses.createdAt));

    return rows.map(TicketMapper.toResponseDomain);
  }
}
