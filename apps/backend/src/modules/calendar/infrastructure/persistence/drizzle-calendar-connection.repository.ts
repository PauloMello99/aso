import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CalendarConnectionData,
  CalendarProvider,
  ICalendarConnectionRepository,
} from "../../domain/calendar-connection.repository.interface";

@Injectable()
export class DrizzleCalendarConnectionRepository
  implements ICalendarConnectionRepository
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByOrg(orgId: string): Promise<CalendarConnectionData | null> {
    const [row] = await this.db
      .select()
      .from(schema.calendarConnections)
      .where(eq(schema.calendarConnections.orgId, orgId))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      orgId: row.orgId,
      provider: row.provider as CalendarProvider,
      externalAccountEmail: row.externalAccountEmail,
      connectedBy: row.connectedBy,
      connectedAt: row.connectedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async deleteByOrg(orgId: string): Promise<boolean> {
    const rows = await this.db
      .delete(schema.calendarConnections)
      .where(eq(schema.calendarConnections.orgId, orgId))
      .returning({ id: schema.calendarConnections.id });
    return rows.length > 0;
  }
}
