import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  ITicketCategoryRepository,
  TicketCategory,
} from "../../domain/ticket-category.repository.interface";
import { TicketMapper } from "./ticket.mapper";

@Injectable()
export class DrizzleTicketCategoryRepository
  implements ITicketCategoryRepository
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listEnabled(): Promise<TicketCategory[]> {
    const rows = await this.db
      .select()
      .from(schema.ticketCategories)
      .where(eq(schema.ticketCategories.enabled, true))
      .orderBy(schema.ticketCategories.label);
    return rows.map(TicketMapper.toCategoryDomain);
  }

  async findById(id: string): Promise<TicketCategory | null> {
    const [row] = await this.db
      .select()
      .from(schema.ticketCategories)
      .where(eq(schema.ticketCategories.id, id))
      .limit(1);
    return row ? TicketMapper.toCategoryDomain(row) : null;
  }
}
