import type { CalendarEvent as CalendarEventRow } from "../../../../database/schema/studio/calendar";
import { CalendarEventEntity } from "../../domain/calendar-event.entity";

export class CalendarEventMapper {
  static toDomain(row: CalendarEventRow): CalendarEventEntity {
    return CalendarEventEntity.create({
      id: row.id,
      orgId: row.orgId,
      assignedTo: row.assignedTo,
      customerId: row.customerId ?? null,
      createdBy: row.createdBy ?? null,
      type: row.type,
      status: row.status,
      title: row.title,
      description: row.description ?? null,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      allDay: row.allDay,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
