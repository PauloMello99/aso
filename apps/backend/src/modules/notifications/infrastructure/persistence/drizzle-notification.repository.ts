import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CreateNotificationData,
  NotificationEntity,
} from "../../domain/notification.entity";
import type {
  INotificationRepository,
  UserContact,
} from "../../domain/notification.repository.interface";
import { NotificationMapper } from "./notification.mapper";

@Injectable()
export class DrizzleNotificationRepository implements INotificationRepository {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async create(data: CreateNotificationData): Promise<NotificationEntity> {
    const [row] = await this.db
      .insert(schema.notifications)
      .values({
        userId: data.userId,
        orgId: data.orgId ?? null,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        data: data.data ?? null,
      })
      .returning();
    return NotificationMapper.toDomain(row!);
  }

  async findByUser(
    userId: string,
    opts?: { unreadOnly?: boolean; limit?: number },
  ): Promise<NotificationEntity[]> {
    const conditions = [eq(schema.notifications.userId, userId)];
    if (opts?.unreadOnly) conditions.push(isNull(schema.notifications.readAt));

    const rows = await this.db
      .select()
      .from(schema.notifications)
      .where(and(...conditions))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(opts?.limit ?? 50);

    return rows.map(NotificationMapper.toDomain);
  }

  async findByOrg(
    orgId: string,
    opts?: { limit?: number },
  ): Promise<NotificationEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.orgId, orgId))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(opts?.limit ?? 50);

    return rows.map(NotificationMapper.toDomain);
  }

  async countUnread(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, userId),
          isNull(schema.notifications.readAt),
        ),
      );
    return row?.n ?? 0;
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.db
      .update(schema.notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(schema.notifications.id, id),
          eq(schema.notifications.userId, userId),
          isNull(schema.notifications.readAt),
        ),
      );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(schema.notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(schema.notifications.userId, userId),
          isNull(schema.notifications.readAt),
        ),
      );
  }

  async findUserIdByAuthId(authId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.authId, authId))
      .limit(1);
    return row?.id ?? null;
  }

  async findUserContact(userId: string): Promise<UserContact | null> {
    const [row] = await this.db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return row ?? null;
  }
}
