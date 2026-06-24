import type { Notification as NotificationRow } from "../../../../database/schema/studio/notifications";
import { NotificationEntity } from "../../domain/notification.entity";

export class NotificationMapper {
  static toDomain(row: NotificationRow): NotificationEntity {
    return NotificationEntity.create({
      id: row.id,
      userId: row.userId,
      orgId: row.orgId ?? null,
      type: row.type,
      title: row.title,
      body: row.body ?? null,
      data: (row.data as Record<string, unknown> | null) ?? null,
      readAt: row.readAt ?? null,
      createdAt: row.createdAt,
    });
  }
}
